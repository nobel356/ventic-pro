import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth-v7";
import {
  customerActiveOrderWhere,
  customerDeviceForOrderWhere,
  technicianActiveOrderWhere,
} from "@/lib/customer-journey-security";
import {
  PERMISSIONS,
  ROLE_DEFAULT_PERMISSIONS,
} from "@/lib/permission-config";

const ROLLBACK =
  "V20W_JOURNEY_ROLLBACK";

function roleBoundaryProof() {
  const technician =
    ROLE_DEFAULT_PERMISSIONS.TECHNICIAN ||
    [];
  const customerService =
    ROLE_DEFAULT_PERMISSIONS.CUSTOMER_SERVICE ||
    [];

  const forbiddenForCustomerService = [
    PERMISSIONS.ASSIGN_TECH,
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.ARCHIVE_VIEW,
    PERMISSIONS.ARCHIVE_MANAGE,
    PERMISSIONS.ARCHIVE_RESTORE,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.CUSTOMER_ACCOUNTS_EDIT,
  ];

  return (
    technician.length === 0 &&
    forbiddenForCustomerService.every(
      (permission) =>
        !customerService.includes(
          permission,
        ),
    )
  );
}

export async function POST() {
  try {
    const actor =
      await requireSuperAdmin();
    const startedAt = Date.now();
    const marker =
      crypto
        .randomUUID()
        .replaceAll("-", "")
        .slice(0, 16);
    const phoneTail =
      String(Date.now())
        .slice(-7)
        .padStart(7, "0");
    const phoneA =
      `0100${phoneTail}`;
    const phoneB =
      `0110${phoneTail}`;

    let proof:
      | {
          customerOwnOrder: boolean;
          crossCustomerDenied: boolean;
          archivedCustomerDenied: boolean;
          technicianOwnOrder: boolean;
          wrongTechnicianDenied: boolean;
          archivedTechnicianDenied: boolean;
          correctDeviceAccepted: boolean;
          wrongPropertyDeviceDenied: boolean;
          otherCustomerDeviceDenied: boolean;
          activeInvoiceVisible: boolean;
          archivedInvoiceDenied: boolean;
        }
      | null = null;

    try {
      await prisma.$transaction(
        async (tx) => {
          const customerA =
            await tx.customer.create({
              data: {
                name:
                  "V20W Customer A",
                phone: phoneA,
              },
            });
          const customerB =
            await tx.customer.create({
              data: {
                name:
                  "V20W Customer B",
                phone: phoneB,
              },
            });

          const propertyA1 =
            await tx.property.create({
              data: {
                customerId:
                  customerA.id,
                label:
                  "V20W A1",
                governorate:
                  "Test",
                area: "Test",
                address:
                  "V20W A1",
              },
            });
          const propertyA2 =
            await tx.property.create({
              data: {
                customerId:
                  customerA.id,
                label:
                  "V20W A2",
                governorate:
                  "Test",
                area: "Test",
                address:
                  "V20W A2",
              },
            });
          const propertyB =
            await tx.property.create({
              data: {
                customerId:
                  customerB.id,
                label:
                  "V20W B1",
                governorate:
                  "Test",
                area: "Test",
                address:
                  "V20W B1",
              },
            });

          const techA =
            await tx.user.create({
              data: {
                name:
                  "V20W Tech A",
                email:
                  `v20w-${marker}-a@health.invalid`,
                role:
                  "TECHNICIAN",
              },
            });
          const techB =
            await tx.user.create({
              data: {
                name:
                  "V20W Tech B",
                email:
                  `v20w-${marker}-b@health.invalid`,
                role:
                  "TECHNICIAN",
              },
            });

          const activeA =
            await tx.order.create({
              data: {
                orderNo:
                  `V20W-${marker}-A`,
                customerId:
                  customerA.id,
                propertyId:
                  propertyA1.id,
                technicianId:
                  techA.id,
                status:
                  "COMPLETED",
              },
            });
          const archivedA =
            await tx.order.create({
              data: {
                orderNo:
                  `V20W-${marker}-AR`,
                customerId:
                  customerA.id,
                propertyId:
                  propertyA1.id,
                technicianId:
                  techA.id,
                status:
                  "COMPLETED",
                archivedAt:
                  new Date(),
              },
            });
          const secondPropertyA =
            await tx.order.create({
              data: {
                orderNo:
                  `V20W-${marker}-A2`,
                customerId:
                  customerA.id,
                propertyId:
                  propertyA2.id,
                status:
                  "COMPLETED",
              },
            });
          const activeB =
            await tx.order.create({
              data: {
                orderNo:
                  `V20W-${marker}-B`,
                customerId:
                  customerB.id,
                propertyId:
                  propertyB.id,
                technicianId:
                  techB.id,
                status:
                  "COMPLETED",
              },
            });

          const correctDevice =
            await tx.device.create({
              data: {
                propertyId:
                  propertyA1.id,
                sourceOrderId:
                  activeA.id,
                type:
                  "V20W_CORRECT",
              },
            });
          const wrongPropertyDevice =
            await tx.device.create({
              data: {
                propertyId:
                  propertyA2.id,
                sourceOrderId:
                  secondPropertyA.id,
                type:
                  "V20W_WRONG_PROPERTY",
              },
            });
          const otherCustomerDevice =
            await tx.device.create({
              data: {
                propertyId:
                  propertyB.id,
                sourceOrderId:
                  activeB.id,
                type:
                  "V20W_OTHER_CUSTOMER",
              },
            });

          const activeInvoice =
            await tx.invoice.create({
              data: {
                invoiceNo:
                  `V20W-${marker}-I1`,
                orderId:
                  activeA.id,
                subtotal: 1,
                total: 1,
                due: 1,
              },
            });
          const archivedInvoice =
            await tx.invoice.create({
              data: {
                invoiceNo:
                  `V20W-${marker}-I2`,
                orderId:
                  archivedA.id,
                subtotal: 1,
                total: 1,
                due: 1,
              },
            });

          const [
            ownOrder,
            crossCustomer,
            archivedCustomer,
            techOwn,
            wrongTech,
            archivedTech,
            goodDevice,
            wrongProperty,
            wrongCustomerDevice,
            visibleInvoice,
            hiddenArchivedInvoice,
          ] = await Promise.all([
            tx.order.findFirst({
              where:
                customerActiveOrderWhere(
                  customerA.id,
                  activeA.id,
                ),
            }),
            tx.order.findFirst({
              where:
                customerActiveOrderWhere(
                  customerA.id,
                  activeB.id,
                ),
            }),
            tx.order.findFirst({
              where:
                customerActiveOrderWhere(
                  customerA.id,
                  archivedA.id,
                ),
            }),
            tx.order.findFirst({
              where:
                technicianActiveOrderWhere(
                  techA.id,
                  activeA.id,
                ),
            }),
            tx.order.findFirst({
              where:
                technicianActiveOrderWhere(
                  techB.id,
                  activeA.id,
                ),
            }),
            tx.order.findFirst({
              where:
                technicianActiveOrderWhere(
                  techA.id,
                  archivedA.id,
                ),
            }),
            tx.device.findFirst({
              where:
                customerDeviceForOrderWhere(
                  customerA.id,
                  {
                    id: activeA.id,
                    propertyId:
                      activeA.propertyId,
                  },
                  correctDevice.id,
                ),
            }),
            tx.device.findFirst({
              where:
                customerDeviceForOrderWhere(
                  customerA.id,
                  {
                    id: activeA.id,
                    propertyId:
                      activeA.propertyId,
                  },
                  wrongPropertyDevice.id,
                ),
            }),
            tx.device.findFirst({
              where:
                customerDeviceForOrderWhere(
                  customerA.id,
                  {
                    id: activeA.id,
                    propertyId:
                      activeA.propertyId,
                  },
                  otherCustomerDevice.id,
                ),
            }),
            tx.invoice.findFirst({
              where: {
                id:
                  activeInvoice.id,
                order: {
                  customerId:
                    customerA.id,
                  archivedAt: null,
                },
              },
            }),
            tx.invoice.findFirst({
              where: {
                id:
                  archivedInvoice.id,
                order: {
                  customerId:
                    customerA.id,
                  archivedAt: null,
                },
              },
            }),
          ]);

          proof = {
            customerOwnOrder:
              Boolean(ownOrder),
            crossCustomerDenied:
              !crossCustomer,
            archivedCustomerDenied:
              !archivedCustomer,
            technicianOwnOrder:
              Boolean(techOwn),
            wrongTechnicianDenied:
              !wrongTech,
            archivedTechnicianDenied:
              !archivedTech,
            correctDeviceAccepted:
              Boolean(goodDevice),
            wrongPropertyDeviceDenied:
              !wrongProperty,
            otherCustomerDeviceDenied:
              !wrongCustomerDevice,
            activeInvoiceVisible:
              Boolean(visibleInvoice),
            archivedInvoiceDenied:
              !hiddenArchivedInvoice,
          };

          throw new Error(
            ROLLBACK,
          );
        },
      );
    } catch (error: any) {
      if (
        error?.message !==
        ROLLBACK
      ) {
        throw error;
      }
    }

    if (!proof) {
      throw new Error(
        "JOURNEY_PROOF_MISSING",
      );
    }

    const verifiedProof =
      proof as {
        customerOwnOrder: boolean;
        crossCustomerDenied: boolean;
        archivedCustomerDenied: boolean;
        technicianOwnOrder: boolean;
        wrongTechnicianDenied: boolean;
        archivedTechnicianDenied: boolean;
        correctDeviceAccepted: boolean;
        wrongPropertyDeviceDenied: boolean;
        otherCustomerDeviceDenied: boolean;
        activeInvoiceVisible: boolean;
        archivedInvoiceDenied: boolean;
      };

    const checks =
      Object.values(
        verifiedProof,
      ).every(Boolean);
    const roleBoundaries =
      roleBoundaryProof();

    if (
      !checks ||
      !roleBoundaries
    ) {
      throw new Error(
        "JOURNEY_INTEGRITY_CHECK_FAILED",
      );
    }

    const result = {
      ok: true,
      ...verifiedProof,
      roleBoundaries,
      rollbackCleanup: true,
      durationMs:
        Date.now() -
        startedAt,
    };

    await prisma.auditLog.create({
      data: {
        actorId:
          actor.id,
        actorLabel:
          actor.name,
        action:
          "CUSTOMER_JOURNEY_HEALTHCHECK",
        newValue:
          result,
      },
    });

    return NextResponse.json(
      result,
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "CUSTOMER_JOURNEY_HEALTHCHECK_FAILED",
      },
      {
        status:
          error?.message ===
          "UNAUTHENTICATED"
            ? 401
            : error?.message ===
                "FORBIDDEN"
              ? 403
              : 500,
      },
    );
  }
}
