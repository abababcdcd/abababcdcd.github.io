"use strict";

const file = "source/_data/home-profile.json";
const linkIds = ["directory", "archive", "tags"];

function validateProfileSettings(input) {
  if (!input || !["left", "right"].includes(input.side)) throw new Error("个人卡片的位置须为左侧或右侧");
  if (!Array.isArray(input.links) || input.links.some((link) => !linkIds.includes(link))) {
    throw new Error("个人卡片的入口设置不正确");
  }
  return { side: input.side, links: linkIds.filter((link) => input.links.includes(link)) };
}

module.exports = { file, validateProfileSettings };
