import fs from "fs";
import mammoth from "mammoth";

export const extractTextFromFile = async (file: Express.Multer.File): Promise<string> => {
  let text = "";

  if (file.mimetype === "application/pdf") {
    const dataBuffer = fs.readFileSync(file.path);

    const pdfModule = await import("pdf-parse");
    const pdfFn =
      typeof pdfModule === "function"
        ? pdfModule
        : (pdfModule as any).default || (pdfModule as any);

    if (typeof pdfFn !== "function") {
      throw new Error("pdf-parse module did not export a function");
    }

    const data = await pdfFn(dataBuffer);
    text = data.text;
  } else if (
    file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const buffer = fs.readFileSync(file.path);
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
  } else {
    throw new Error("Unsupported file type");
  }

  fs.unlinkSync(file.path); // xóa file tạm
  return text;
};
