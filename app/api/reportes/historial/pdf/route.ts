import { NextResponse } from "next/server";
import puppeteer from "puppeteer";

export async function GET(request: Request) {
    try {
        const { searchParams, origin } = new URL(request.url);
        const token = searchParams.get("token");
        const dni = searchParams.get("dni");

        if (!token && !dni) {
            return NextResponse.json({ error: "Se requiere token o dni" }, { status: 400 });
        }

        // Determine the base url to call the page that renders the HTML
        // We use the same origin, but during local dev we could force localhost
        const baseUrl = origin.includes("localhost") ? origin : "https://tecsur.edu.pe";

        // Construct the URL exactly as handled by `app/reportes/historial/page.tsx`
        const urlParams = new URLSearchParams();
        if (token) urlParams.append("token", token);
        if (dni) urlParams.append("dni", dni);

        const reportUrl = `${baseUrl}/reportes/historial?${urlParams.toString()}`;

        const browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

        const page = await browser.newPage();

        // Set viewport to A4 size
        await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

        // Navigate to the un-rendered react page 
        // networkidle0 waits until there are no more than 0 network connections for at least 500 ms.
        await page.goto(reportUrl, { waitUntil: "networkidle0" });

        // Generate PDF
        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: {
                top: "10mm",
                bottom: "10mm",
                left: "10mm",
                right: "10mm"
            }
        });

        await browser.close();

        // Return the generated PDF
        return new NextResponse(Buffer.from(pdfBuffer), {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="reporte_historial_${dni || 'token'}.pdf"`,
            },
        });
    } catch (error) {
        console.error("Error generating PDF:", error);
        return NextResponse.json({ error: "Error al generar el PDF internamente." }, { status: 500 });
    }
}
