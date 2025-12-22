import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";

interface ReportData {
  projectName: string;
  date: string;
  htmlContent: string;
}

export const generateAndSharePDF = async (data: ReportData) => {
  const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Rapport Kaptur</title>
        <style>
            body {
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                color: #1f2937; /* Gris très foncé */
                line-height: 1.6;
                padding: 40px;
                background-color: #ffffff;
            }

            /* HEADER */
            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 2px solid #3b82f6; /* Bleu Primary */
                padding-bottom: 20px;
                margin-bottom: 40px;
            }
            .brand {
                font-size: 24px;
                font-weight: bold;
                color: #000;
                letter-spacing: -1px;
            }
            .brand span { color: #3b82f6; }

            .meta {
                text-align: right;
                font-size: 12px;
                color: #6b7280;
            }

            /* CONTENU */
            h1 { font-size: 24px; color: #111827; margin-top: 30px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; }
            h2 { font-size: 18px; color: #374151; margin-top: 25px; font-weight: bold; }
            h3 { font-size: 16px; color: #3b82f6; margin-top: 20px; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;}
            p { margin-bottom: 15px; font-size: 14px; text-align: justify; }
            ul { margin-bottom: 15px; padding-left: 20px; }
            li { margin-bottom: 5px; font-size: 14px; }
            strong { color: #000; }

            /* FOOTER */
            .footer {
                margin-top: 60px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                text-align: center;
                font-size: 10px;
                color: #9ca3af;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="brand">KAPTUR<span>.</span></div>
            <div class="meta">
                <p><strong>Projet :</strong> ${data.projectName}</p>
                <p><strong>Date :</strong> ${data.date}</p>
            </div>
        </div>

        <div class="content">
            ${data.htmlContent}
        </div>

        <div class="footer">
            Généré avec Kaptur
        </div>
    </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html });
    await shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" });
  } catch (error) {
    console.error("Erreur génération PDF:", error);
    throw new Error("Impossible de générer le PDF");
  }
};
