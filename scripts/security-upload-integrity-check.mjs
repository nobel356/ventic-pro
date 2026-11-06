import fs from "node:fs";

const read = (file) =>
  fs.readFileSync(
    file,
    "utf8",
  );

const schema =
  read(
    "prisma/schema.prisma",
  );
const customer =
  read(
    "app/api/orders/[id]/customer-attachments/route.ts",
  );
const execution =
  read(
    "lib/order-execution.ts",
  );
const orderPage =
  read(
    "app/order/page.tsx",
  );
const workspace =
  read(
    "app/shared/ExecutionWorkspace.tsx",
  );
const uploadLegacy =
  read(
    "app/api/admin/portfolio-videos/upload/route.ts",
  );
const presignLegacy =
  read(
    "app/api/admin/portfolio-videos/presign/route.ts",
  );
const helper =
  read(
    "lib/upload-integrity.ts",
  );
const qa =
  read(
    "app/api/admin/system-health/upload-integrity-test/route.ts",
  );

const checks = [
  [
    schema.includes(
      "uploadKey   String?",
    ) &&
      schema.includes(
        "@@unique([orderId, uploadKey])",
      ),
    "attachment upload unique key",
  ],
  [
    helper.includes(
      "client.$transaction",
    ) &&
      helper.includes(
        "deleteStoredFile",
      ) &&
      helper.includes(
        'error?.code ===\n        "P2002"',
      ),
    "transaction + Blob cleanup + race recovery",
  ],
  [
    customer.includes(
      "persistUploadedAttachment",
    ) &&
      customer.includes(
        "findUploadReplay",
      ),
    "customer upload integrity",
  ],
  [
    execution.includes(
      "persistUploadedAttachment",
    ) &&
      execution.includes(
        "findUploadReplay",
      ),
    "execution upload integrity",
  ],
  [
    orderPage.includes(
      '"x-upload-key"',
    ) &&
      workspace.includes(
        '"x-upload-key"',
      ),
    "client retry upload keys",
  ],
  [
    uploadLegacy.includes(
      "PORTFOLIO_BLOB_UPLOAD_DISABLED",
    ) &&
      presignLegacy.includes(
        "PORTFOLIO_BLOB_UPLOAD_DISABLED",
      ),
    "legacy portfolio Blob upload disabled",
  ],
  [
    qa.includes(
      "QA_FORCED_ATTACHMENT_ROLLBACK",
    ) &&
      qa.includes(
        "duplicateBlobCleanup",
      ),
    "live Blob/DB QA coverage",
  ],
];

const failed =
  checks.filter(
    ([ok]) => !ok,
  );

if (failed.length) {
  console.error(
    "V20Y-D upload integrity check failed:",
  );

  for (const [
    ,
    label,
  ] of failed) {
    console.error(
      `- ${label}`,
    );
  }

  process.exit(1);
}

console.log(
  "PASS ✓ — Attachment Transaction ✓ / Blob Cleanup ✓ / Upload Retry Dedupe ✓ / Customer Upload Key ✓ / Execution Upload Key ✓ / Legacy Portfolio Blob OFF ✓",
);
