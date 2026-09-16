import { createCn } from "cn/config"

const textRoles = [
  "title",
  "title-sm",
  "body",
  "body-strong",
  "label",
  "caption",
  "button",
  "code",
  "kbd",
]

export const cn = createCn({
  extend: { classGroups: { "font-size": [{ text: textRoles }] } },
})
