const Canvas = require("canvas");
const assert = require("assert");
const fs = require("fs");
const util = require("util");
const jsdom = require("jsdom");
const pdfjsLib = require("pdfjs-dist");

const writeFile = util.promisify(fs.writeFile);

const dom = new jsdom.JSDOM(`...`);
global["document"] = dom.window.document;

class NodeCanvasFactory {
  create(width, height) {
    assert(width > 0 && height > 0, "Invalid canvas size");
    const canvas = Canvas.createCanvas(width, height);
    const context = canvas.getContext("2d");
    return {
      canvas: canvas,
      context: context
    };
  }

  reset(canvasAndContext, width, height) {
    assert(canvasAndContext.canvas, "Canvas is not specified");
    assert(width > 0 && height > 0, "Invalid canvas size");
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  destroy(canvasAndContext) {
    assert(canvasAndContext.canvas, "Canvas is not specified");

    // Zeroing the width and height cause Firefox to release graphics
    // resources immediately, which can greatly reduce memory consumption.
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

async function main() {
  // Relative path of the PDF file.
  const pdfURL = "./test.pdf";

  // Read the PDF file into a typed array so PDF.js can load it.
  const rawData = new Uint8Array(fs.readFileSync(pdfURL));

  // Load the PDF file.
  pdfDocument = await pdfjsLib.getDocument(rawData).promise;

  for (let i = 1; i <= pdfDocument.numPages; i++) {
    console.log("page", i);
    // Get page
    const page = await pdfDocument.getPage(i);

    // Render the page on a Node canvas with 100% scale.
    const viewport = page.getViewport({ scale: 1.0 });
    const canvasFactory = new NodeCanvasFactory();
    const canvasAndContext = canvasFactory.create(
      viewport.width,
      viewport.height
    );
    const renderContext = {
      canvasContext: canvasAndContext.context,
      viewport: viewport,
      canvasFactory: canvasFactory
    };

    await page.render(renderContext).promise;
    const image = canvasAndContext.canvas.toBuffer();
    await writeFile(`page_${i}.png`, image);
  }
}

main();
