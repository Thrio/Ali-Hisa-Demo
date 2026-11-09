import { defineField, defineType } from "sanity";

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Site settings",
  type: "document",
  fields: [
    defineField({ name: "name", type: "string" }),
    defineField({ name: "defaultDescription", type: "text" }),
    defineField({ name: "phonePrimary", type: "string" }),
    defineField({ name: "phoneSecondary", type: "string" }),
    defineField({ name: "email", type: "string" }),
    defineField({ name: "facebookUrl", type: "url" }),
    defineField({ name: "instagramUrl", type: "url" }),
    defineField({ name: "city", type: "string" }),
    defineField({ name: "country", type: "string" }),
    defineField({ name: "foundedYear", type: "number" }),
    defineField({
      name: "footer",
      type: "object",
      fields: [
        defineField({ name: "tagline", type: "string" }),
        defineField({ name: "intro", type: "text" }),
        defineField({ name: "services", type: "array", of: [{ type: "string" }] }),
      ],
    }),
    defineField({ name: "primaryCtaLabel", type: "string" }),
  ],
});
