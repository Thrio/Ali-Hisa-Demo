import { defineArrayMember, defineField, defineType } from "sanity";

export const page = defineType({
  name: "page",
  title: "Page",
  type: "document",
  fields: [
    defineField({ name: "title", type: "string" }),
    defineField({ name: "slug", type: "slug", options: { source: "title" } }),
    defineField({
      name: "sections",
      type: "array",
      of: [defineArrayMember({ type: "object", name: "sectionStub", fields: [{ name: "key", type: "string" }] })],
    }),
  ],
});
