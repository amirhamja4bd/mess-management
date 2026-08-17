import { connectToDatabase } from "@/lib/db";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { PaymentMethodModel } from "@/lib/models";
import type { OrgContext } from "@/lib/authorization";

export interface CreatePaymentMethodInput {
  name: string;
  sortOrder: number;
}

export interface UpdatePaymentMethodInput {
  name?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export async function listPaymentMethods(context: OrgContext) {
  await connectToDatabase();
  return PaymentMethodModel.find({ organizationId: context.organizationId }).sort({
    sortOrder: 1,
    name: 1,
  });
}

export async function createPaymentMethod(context: OrgContext, input: CreatePaymentMethodInput) {
  await connectToDatabase();
  const existing = await PaymentMethodModel.findOne({
    organizationId: context.organizationId,
    name: input.name,
  });
  if (existing) {
    throw new ConflictError("A payment method with this name already exists");
  }
  return PaymentMethodModel.create({
    organizationId: context.organizationId,
    name: input.name,
    sortOrder: input.sortOrder,
    isActive: true,
  });
}

export async function updatePaymentMethod(
  context: OrgContext,
  methodId: string,
  input: UpdatePaymentMethodInput
) {
  await connectToDatabase();
  const method = await PaymentMethodModel.findOne({
    _id: methodId,
    organizationId: context.organizationId,
  });
  if (!method) {
    throw new NotFoundError("Payment method not found");
  }
  if (input.name !== undefined) {
    const duplicate = await PaymentMethodModel.findOne({
      organizationId: context.organizationId,
      name: input.name,
      _id: { $ne: method._id },
    });
    if (duplicate) {
      throw new ConflictError("A payment method with this name already exists");
    }
    method.name = input.name;
  }
  if (input.sortOrder !== undefined) {
    method.sortOrder = input.sortOrder;
  }
  if (input.isActive !== undefined) {
    method.isActive = input.isActive;
  }
  await method.save();
  return method;
}

export async function archivePaymentMethod(context: OrgContext, methodId: string) {
  await connectToDatabase();
  const method = await PaymentMethodModel.findOne({
    _id: methodId,
    organizationId: context.organizationId,
  });
  if (!method) {
    throw new NotFoundError("Payment method not found");
  }
  method.isActive = false;
  method.archivedAt = new Date();
  await method.save();
  return method;
}
