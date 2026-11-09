import { defineField, defineType } from "sanity";

export const project = defineType({
  name: "project",
  title: "Project",
  type: "document",
  fields: [
    defineField({ name: "title", type: "string" }),
    defineField({ name: "slug", type: "slug", options: { source: "title" } }),
    defineField({ name: "summary", type: "text" }),
    defineField({ name: "location", type: "string" }),
    defineField({ name: "year", type: "number" }),
  ],
});
