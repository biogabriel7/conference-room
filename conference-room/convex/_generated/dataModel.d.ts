/* eslint-disable */
import type { GenericId } from "convex/values";

export type Id<TableName extends string> = GenericId<TableName>;

export type DataModel = {
  bookings: {
    document: {
      _id: Id<"bookings">;
      _creationTime: number;
      slotDate: string;
      slotTime: string;
      slotCount: number;
      name: string;
      company: "nilo" | "first-plug" | "volantis";
      note: string;
      createdAt: number;
      slotChangedAt?: number;
    };
    fieldPaths:
      | "_id"
      | "_creationTime"
      | "slotDate"
      | "slotTime"
      | "slotCount"
      | "name"
      | "company"
      | "note"
      | "createdAt"
      | "slotChangedAt";
    indexes: {
      by_slot_date: ["slotDate", "_creationTime"];
      by_slot: ["slotDate", "slotTime", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
};
