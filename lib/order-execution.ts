import { AdminNotificationType } from "@prisma/client";
import { newOtp, hashOtp, otpMatches } from "@/lib/otp";
import {
  buildInventoryNote,
  parseInventoryNote,
} from "@/lib/inventory";
import {
  getOrderMaterialState,
  technicianItemBalance,
} from "@/lib/order-materials";
import {
  calculateOrderFinancials,
  syncOrderInvoice,
} from "@/lib/order-financials";
import {
  deliverCompletionOtp,
  otpStagingVisible,
} from "@/lib/customer-messaging";
import { notifyAdmins } from "@/lib/admin-notifications";

export const OTP_TTL_MINUTES = 15;
export const OTP_RESEND_SECONDS = 60;

export type ExecutionActor = {
  id: string;
  name: string;
  mode: "TECHNICIAN" | "ADMIN";
};

function warrantyDays() {
  const parsed = Number(
    process.env.DEFAULT_WARRANTY_DAYS || 365,
  );

  return Number.isFinite(parsed) && parsed > 0
    ? Math.floor(parsed)
    : 365;
}

async function getOrder(client: any, orderId: string) {
  return client.order.findUnique({
    where: { id: orderId },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      technician: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
    },
  });
}

export async function getExecutionSnapshot(
  client: any,
  orderId: string,
  assignedTechnicianId: string,
) {
  const order = await getOrder(client, orderId);

  if (!order) throw new Error("ORDER_NOT_FOUND");

  const [
    beforeCount,
    afterCount,
    materialState,
    items,
    financials,
    lastOtpAudit,
  ] = await Promise.all([
    client.attachment.count({
      where: { orderId, kind: "BEFORE" },
    }),
    client.attachment.count({
      where: { orderId, kind: "AFTER" },
    }),
    getOrderMaterialState(
      client,
      orderId,
      assignedTechnicianId,
    ),
    client.inventoryItem.findMany({
      where: { active: true },
      orderBy: { nameAr: "asc" },
    }),
    calculateOrderFinancials(client, orderId),
    client.auditLog.findFirst({
      where: {
        orderId,
        action: "COMPLETION_OTP_ISSUED",
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const balances = await Promise.all(
    items.map(async (item: any) => ({
      id: item.id,
      sku: item.sku,
      nameAr: item.nameAr,
      unit: item.unit,
      balance: await technicianItemBalance(
        client,
        item.id,
        assignedTechnicianId,
      ),
    })),
  );

  const elapsedSeconds = lastOtpAudit
    ? Math.floor(
        (Date.now() -
          new Date(lastOtpAudit.createdAt).getTime()) /
          1000,
      )
    : OTP_RESEND_SECONDS;

  const resendAfterSeconds = Math.max(
    0,
    OTP_RESEND_SECONDS - elapsedSeconds,
  );

  return {
    order: {
      id: order.id,
      orderNo: order.orderNo,
      status: order.status,
      customerName: order.customer.name,
      customerPhoneMasked:
        order.customer.phone.length >= 5
          ? `${order.customer.phone.slice(
              0,
              3,
            )}******${order.customer.phone.slice(-2)}`
          : "********",
      technicianId: order.technicianId,
      technicianName:
        order.technician?.name || null,
    },
    photos: {
      before: beforeCount,
      after: afterCount,
    },
    materials: {
      confirmed: materialState.confirmed,
      confirmedNone:
        materialState.confirmedNone,
      items: balances.filter(
        (item: any) => item.balance > 0,
      ),
      usage: materialState.usedMovements.map(
        (movement: any) => {
          const parsed = parseInventoryNote(
            movement.note,
          );

          return {
            id: movement.id,
            itemName: movement.item.nameAr,
            sku: movement.item.sku,
            unit: movement.item.unit,
            quantity: Number(
              movement.quantity,
            ),
            note: parsed.note,
            createdAt: movement.createdAt,
          };
        },
      ),
    },
    finance: {
      authoritative:
        financials.authoritative,
      source: financials.source,
      total: financials.total,
      paid: financials.paid,
      due: financials.due,
    },
    otp: {
      active:
        Boolean(order.completionOtpHash) &&
        Boolean(order.completionOtpExpiresAt) &&
        new Date(
          order.completionOtpExpiresAt!,
        ).getTime() > Date.now(),
      expiresAt:
        order.completionOtpExpiresAt || null,
      resendAfterSeconds,
      stagingVisible:
        otpStagingVisible(),
    },
  };
}

export async function addExecutionAttachment(
  client: any,
  input: {
    orderId: string;
    actor: ExecutionActor;
    kind: "BEFORE" | "AFTER";
    file: File;
  },
) {
  if (!input.file.type.startsWith("image/")) {
    throw new Error("INVALID_IMAGE");
  }

  if (input.file.size > 8 * 1024 * 1024) {
    throw new Error("IMAGE_TOO_LARGE");
  }

  const item = await client.attachment.create({
    data: {
      orderId: input.orderId,
      kind: input.kind,
      fileName: input.file.name,
      mimeType: input.file.type,
      storagePath: `pending://${crypto.randomUUID()}/${input.file.name}`,
      uploadedBy: input.actor.id,
    },
  });

  await client.auditLog.create({
    data: {
      orderId: input.orderId,
      actorId: input.actor.id,
      actorLabel: input.actor.name,
      action:
        input.kind === "BEFORE"
          ? "BEFORE_PHOTO_ADDED"
          : "AFTER_PHOTO_ADDED",
      newValue: {
        attachmentId: item.id,
        fileName: input.file.name,
        executionMode: input.actor.mode,
      },
    },
  });

  return item;
}

export async function confirmNoExecutionMaterials(
  client: any,
  input: {
    orderId: string;
    assignedTechnicianId: string;
    actor: ExecutionActor;
  },
) {
  const state = await getOrderMaterialState(
    client,
    input.orderId,
    input.assignedTechnicianId,
  );

  if (state.usedMovements.length > 0) {
    throw new Error("MATERIALS_ALREADY_USED");
  }

  const existing =
    await client.auditLog.findFirst({
      where: {
        orderId: input.orderId,
        action:
          "ORDER_MATERIALS_CONFIRMED_NONE",
      },
    });

  if (!existing) {
    await client.auditLog.create({
      data: {
        orderId: input.orderId,
        actorId: input.actor.id,
        actorLabel: input.actor.name,
        action:
          "ORDER_MATERIALS_CONFIRMED_NONE",
        newValue: {
          assignedTechnicianId:
            input.assignedTechnicianId,
          executionMode:
            input.actor.mode,
          confirmedAt:
            new Date().toISOString(),
        },
      },
    });
  }

  return { ok: true };
}

export async function useExecutionMaterial(
  client: any,
  input: {
    orderId: string;
    assignedTechnicianId: string;
    actor: ExecutionActor;
    itemId: string;
    quantity: number;
    note?: string;
  },
) {
  if (
    !input.itemId ||
    !Number.isFinite(input.quantity) ||
    input.quantity <= 0
  ) {
    throw new Error("INVALID_MATERIAL");
  }

  return client.$transaction(
    async (tx: any) => {
      const item =
        await tx.inventoryItem.findFirst({
          where: {
            id: input.itemId,
            active: true,
          },
        });

      if (!item) {
        throw new Error("ITEM_NOT_FOUND");
      }

      const balance =
        await technicianItemBalance(
          tx,
          input.itemId,
          input.assignedTechnicianId,
        );

      if (balance < input.quantity) {
        throw new Error(
          "INSUFFICIENT_TECH",
        );
      }

      const movement =
        await tx.inventoryMovement.create({
          data: {
            itemId: input.itemId,
            technicianId:
              input.assignedTechnicianId,
            orderId: input.orderId,
            type: "OUT",
            quantity: input.quantity,
            note: buildInventoryNote(
              "TECH_OUT",
              input.note ||
                "استخدام في تنفيذ الطلب",
            ),
          },
        });

      await tx.auditLog.create({
        data: {
          orderId: input.orderId,
          actorId: input.actor.id,
          actorLabel: input.actor.name,
          action: "ORDER_MATERIAL_USED",
          newValue: {
            movementId: movement.id,
            itemId: item.id,
            sku: item.sku,
            itemName: item.nameAr,
            quantity: input.quantity,
            unit: item.unit,
            assignedTechnicianId:
              input.assignedTechnicianId,
            technicianBalanceBefore:
              balance,
            technicianBalanceAfter:
              balance - input.quantity,
            executionMode:
              input.actor.mode,
            note: input.note || null,
          },
        },
      });

      return {
        movementId: movement.id,
        balanceAfter:
          balance - input.quantity,
      };
    },
    {
      isolationLevel: "Serializable",
    },
  );
}

export async function issueExecutionOtp(
  client: any,
  input: {
    orderId: string;
    assignedTechnicianId: string;
    actor: ExecutionActor;
  },
) {
  const order = await getOrder(
    client,
    input.orderId,
  );

  if (!order) throw new Error("ORDER_NOT_FOUND");

  const [
    before,
    after,
    materialState,
    financials,
    lastOtpAudit,
  ] = await Promise.all([
    client.attachment.count({
      where: {
        orderId: input.orderId,
        kind: "BEFORE",
      },
    }),
    client.attachment.count({
      where: {
        orderId: input.orderId,
        kind: "AFTER",
      },
    }),
    getOrderMaterialState(
      client,
      input.orderId,
      input.assignedTechnicianId,
    ),
    calculateOrderFinancials(
      client,
      input.orderId,
    ),
    client.auditLog.findFirst({
      where: {
        orderId: input.orderId,
        action:
          "COMPLETION_OTP_ISSUED",
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  if (!before || !after) {
    throw new Error("PHOTOS_REQUIRED");
  }

  if (!materialState.confirmed) {
    throw new Error("MATERIALS_REQUIRED");
  }

  if (!financials.authoritative) {
    throw new Error(
      "QUOTE_NOT_ACCEPTED",
    );
  }

  if (lastOtpAudit) {
    const elapsed = Math.floor(
      (Date.now() -
        new Date(
          lastOtpAudit.createdAt,
        ).getTime()) /
        1000,
    );

    if (elapsed < OTP_RESEND_SECONDS) {
      throw new Error(
        `OTP_COOLDOWN:${
          OTP_RESEND_SECONDS - elapsed
        }`,
      );
    }
  }

  const otp = newOtp();
  const expiresAt = new Date(
    Date.now() +
      OTP_TTL_MINUTES * 60 * 1000,
  );

  await client.order.update({
    where: {
      id: input.orderId,
    },
    data: {
      completionOtpHash: hashOtp(
        input.orderId,
        otp,
      ),
      completionOtpExpiresAt:
        expiresAt,
    },
  });

  const delivery =
    await deliverCompletionOtp({
      phone: order.customer.phone,
      otp,
      orderNo: order.orderNo,
    });

  const notificationChannel =
    delivery.channel === "WHATSAPP"
      ? "WHATSAPP"
      : delivery.channel === "SMS"
        ? "SMS"
        : "IN_APP";

  await client.notification.create({
    data: {
      orderId: input.orderId,
      customerId: order.customer.id,
      channel: notificationChannel,
      templateKey:
        "ORDER_COMPLETION_OTP",
      destinationMasked:
        delivery.destinationMasked,
      payload: {
        orderNo: order.orderNo,
        expiresAt:
          expiresAt.toISOString(),
        provider: delivery.provider,
        staging:
          otpStagingVisible(),
      },
      status: delivery.sent
        ? "SENT"
        : "FAILED",
      error: delivery.sent
        ? null
        : delivery.error ||
          "MESSAGING_DISABLED",
      sentAt: delivery.sent
        ? new Date()
        : null,
    },
  });

  await client.auditLog.create({
    data: {
      orderId: input.orderId,
      actorId: input.actor.id,
      actorLabel: input.actor.name,
      action:
        "COMPLETION_OTP_ISSUED",
      newValue: {
        expiresAt:
          expiresAt.toISOString(),
        deliverySent: delivery.sent,
        deliveryChannel:
          delivery.channel,
        provider:
          delivery.provider,
        destinationMasked:
          delivery.destinationMasked,
        executionMode:
          input.actor.mode,
        resendAfterSeconds:
          OTP_RESEND_SECONDS,
      },
    },
  });

  if (
    !delivery.sent &&
    !otpStagingVisible()
  ) {
    await notifyAdmins({
      type: AdminNotificationType.OTP_ALERT,
      title: `تعذر إرسال كود إتمام — ${order.orderNo}`,
      message:
        "تم إنشاء الكود لكن خدمة WhatsApp/SMS لم تؤكد الإرسال. راجع إعدادات الرسائل قبل إعادة المحاولة.",
      orderId: input.orderId,
      href: `/admin/orders/${input.orderId}`,
      dedupeKey: `otp-delivery-failed:${input.orderId}:${Math.floor(
        Date.now() / 60000,
      )}`,
    });
  }

  return {
    ok: true,
    message: delivery.sent
      ? `تم إرسال الكود للعميل عبر ${
          delivery.channel === "WHATSAPP"
            ? "WhatsApp"
            : "SMS"
        }.`
      : otpStagingVisible()
        ? "وضع التجربة: لم يتم إرسال رسالة فعلية، والكود ظاهر لاختبار دورة التشغيل."
        : "تم إنشاء الكود ولكن تعذر إرسال الرسالة.",
    delivery: {
      sent: delivery.sent,
      channel: delivery.channel,
      provider: delivery.provider,
      destinationMasked:
        delivery.destinationMasked,
    },
    expiresAt,
    resendAfterSeconds:
      OTP_RESEND_SECONDS,
    stagingOtp: otpStagingVisible()
      ? otp
      : undefined,
  };
}

export async function completeExecution(
  client: any,
  input: {
    orderId: string;
    assignedTechnicianId: string;
    actor: ExecutionActor;
    otp: string;
  },
) {
  const order = await getOrder(
    client,
    input.orderId,
  );

  if (!order) throw new Error("ORDER_NOT_FOUND");

  if (order.status === "COMPLETED") {
    throw new Error("ALREADY_COMPLETED");
  }

  const [
    before,
    after,
    materialState,
    financialState,
  ] = await Promise.all([
    client.attachment.count({
      where: {
        orderId: input.orderId,
        kind: "BEFORE",
      },
    }),
    client.attachment.count({
      where: {
        orderId: input.orderId,
        kind: "AFTER",
      },
    }),
    getOrderMaterialState(
      client,
      input.orderId,
      input.assignedTechnicianId,
    ),
    calculateOrderFinancials(
      client,
      input.orderId,
    ),
  ]);

  if (!before || !after) {
    throw new Error("PHOTOS_REQUIRED");
  }

  if (!materialState.confirmed) {
    throw new Error("MATERIALS_REQUIRED");
  }

  if (!financialState.authoritative) {
    throw new Error("QUOTE_NOT_ACCEPTED");
  }

  const expired =
    !order.completionOtpHash ||
    !order.completionOtpExpiresAt ||
    new Date(
      order.completionOtpExpiresAt,
    ) < new Date();

  const invalid =
    !expired &&
    !otpMatches(
      input.orderId,
      String(input.otp || ""),
      order.completionOtpHash!,
    );

  if (expired || invalid) {
    const bucket = Math.floor(
      Date.now() / (10 * 60_000),
    );

    await notifyAdmins({
      type: AdminNotificationType.OTP_ALERT,
      title: `${
        expired
          ? "كود إتمام منتهي"
          : "محاولة كود إتمام غير صحيحة"
      } — ${order.orderNo}`,
      message: `${input.actor.name} حاول إتمام الطلب ولم يتم اعتماد كود العميل.`,
      orderId: input.orderId,
      href: `/admin/orders/${input.orderId}`,
      dedupeKey: expired
        ? `otp-expired:${input.orderId}`
        : `otp-invalid:${input.orderId}:${bucket}`,
    });

    throw new Error("OTP_INVALID");
  }

  const completedAt = new Date();
  const warrantyEndsAt =
    new Date(completedAt);
  warrantyEndsAt.setDate(
    warrantyEndsAt.getDate() +
      warrantyDays(),
  );

  const result = await client.$transaction(
    async (tx: any) => {
      await tx.order.update({
        where: {
          id: input.orderId,
        },
        data: {
          status: "COMPLETED",
          completionOtpHash: null,
          completionOtpExpiresAt: null,
        },
      });

      let warranty =
        await tx.warranty.findFirst({
          where: {
            orderId: input.orderId,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

      if (!warranty) {
        warranty =
          await tx.warranty.create({
            data: {
              orderId:
                input.orderId,
              startsAt: completedAt,
              endsAt:
                warrantyEndsAt,
              status: "ACTIVE",
              notes: `تم تفعيل الضمان تلقائيًا عند إتمام الطلب لمدة ${warrantyDays()} يوم.`,
            },
          });

        await tx.auditLog.create({
          data: {
            orderId:
              input.orderId,
            actorId:
              input.actor.id,
            actorLabel:
              input.actor.name,
            action:
              "WARRANTY_AUTO_CREATED",
            newValue: {
              warrantyId:
                warranty.id,
              startsAt:
                warranty.startsAt.toISOString(),
              endsAt:
                warranty.endsAt.toISOString(),
              days:
                warrantyDays(),
              executionMode:
                input.actor.mode,
            },
          },
        });
      }

      const finance =
        await syncOrderInvoice(
          tx,
          input.orderId,
        );

      await tx.auditLog.create({
        data: {
          orderId: input.orderId,
          actorId: input.actor.id,
          actorLabel:
            input.actor.name,
          action:
            "ORDER_COMPLETED_WITH_OTP",
          oldValue: {
            status: order.status,
          },
          newValue: {
            status: "COMPLETED",
            assignedTechnicianId:
              input.assignedTechnicianId,
            materialUsageCount:
              materialState.usedMovements
                .length,
            materialsConfirmedNone:
              materialState.confirmedNone,
            invoiceId:
              finance.invoice.id,
            invoiceTotal:
              finance.financials.total,
            warrantyId:
              warranty.id,
            executionMode:
              input.actor.mode,
          },
        },
      });

      return {
        warranty,
        finance,
      };
    },
    {
      isolationLevel: "Serializable",
    },
  );

  await notifyAdmins({
    type:
      AdminNotificationType.ORDER_COMPLETED,
    title: `تم إكمال الطلب ${order.orderNo}`,
    message: `${input.actor.name} أنهى التركيب بكود العميل. تم تحديث الفاتورة وتفعيل الضمان تلقائيًا.`,
    orderId: input.orderId,
    href: `/admin/orders/${input.orderId}`,
    dedupeKey: `order-completed:${input.orderId}`,
  });

  return {
    ok: true,
    invoiceTotal:
      result.finance.financials.total,
    due:
      result.finance.financials.due,
    warrantyEndsAt:
      result.warranty.endsAt,
  };
}

export function executionErrorResponse(
  error: any,
) {
  const message = String(
    error?.message || "",
  );

  const map: Record<
    string,
    { status: number; error: string }
  > = {
    ORDER_NOT_FOUND: {
      status: 404,
      error: "الطلب غير موجود",
    },
    INVALID_IMAGE: {
      status: 400,
      error: "الملف يجب أن يكون صورة",
    },
    IMAGE_TOO_LARGE: {
      status: 400,
      error: "الصورة يجب ألا تزيد عن 8MB",
    },
    MATERIALS_ALREADY_USED: {
      status: 409,
      error:
        "تم تسجيل خامات مستخدمة بالفعل لهذا الطلب",
    },
    INVALID_MATERIAL: {
      status: 400,
      error:
        "اختر الخامة وأدخل كمية صحيحة",
    },
    ITEM_NOT_FOUND: {
      status: 404,
      error:
        "الصنف غير موجود أو موقوف",
    },
    INSUFFICIENT_TECH: {
      status: 409,
      error:
        "عهدة الفني لا تكفي. حوّل الخامة للفني من المخزون أولًا.",
    },
    PHOTOS_REQUIRED: {
      status: 400,
      error:
        "صور قبل وبعد مطلوبة قبل إصدار الكود أو الإتمام",
    },
    MATERIALS_REQUIRED: {
      status: 400,
      error:
        "سجل الخامات المستخدمة أو أكد عدم استخدام خامات أولًا",
    },
    QUOTE_NOT_ACCEPTED: {
      status: 409,
      error:
        "لا يمكن إتمام الطلب قبل اعتماد مقايسة Ventic Pro من العميل",
    },
    OTP_INVALID: {
      status: 400,
      error:
        "كود التأكيد غير صحيح أو منتهي",
    },
    ALREADY_COMPLETED: {
      status: 409,
      error:
        "الطلب مكتمل بالفعل",
    },
  };

  if (message.startsWith("OTP_COOLDOWN:")) {
    const seconds = Number(
      message.split(":")[1] || 0,
    );

    return {
      status: 429,
      body: {
        error: `يمكن إعادة إرسال الكود بعد ${seconds} ثانية`,
        retryAfterSeconds: seconds,
      },
    };
  }

  const known = map[message];

  if (known) {
    return {
      status: known.status,
      body: {
        error: known.error,
      },
    };
  }

  return {
    status: 500,
    body: {
      error:
        message ||
        "تعذر تنفيذ العملية",
    },
  };
}
