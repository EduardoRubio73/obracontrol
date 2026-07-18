import html2pdf from "html2pdf.js";

export async function generatePdfFromHtml(html: string, filename: string, margin = 10): Promise<Blob | null> {
  try {
    const pdfBlob: Blob = await html2pdf()
      .set({
        margin,
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, logging: false },
        jsPDF: { orientation: "portrait", unit: "mm", format: "a4" },
      })
      .from(html)
      .outputPdf("blob");
    return pdfBlob;
  } catch (e) {
    console.error("Erro ao gerar PDF:", e);
    return null;
  }
}

export function downloadPdfBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function toBase64(url: string): Promise<string> {
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}
