import { Schema, model } from "mongoose";

const subscriptionSchema = new Schema(
  {
    subscribers: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    subscribed: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Subscription = model("Subscription", subscriptionSchema);
