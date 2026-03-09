import { Book } from "./Book.js";

if (typeof p5 !== "undefined")
  p5.registerAddon(function (p5, fn) {
    fn.createBook = function (
      widthOrSize,
      heightOrPages,
      totalPagesOrFilename,
      unitOrFilename,
      filenameArg,
    ) {
      return new Book(
        this,
        widthOrSize,
        heightOrPages,
        totalPagesOrFilename,
        unitOrFilename,
        filenameArg,
      );
    };
  });
