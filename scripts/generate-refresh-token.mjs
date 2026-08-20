// Temporary one-off: generate a Google Ads API refresh token via OAuth
// (Desktop app / loopback redirect). Credentials are read from the ENVIRONMENT
// so this file never contains secrets. Run:
//
//   GOOGLE_ADS_CLIENT_ID=... GOOGLE_ADS_CLIENT_SECRET=... \
//     node scripts/generate-refresh-token.mjs
//
// It prints an authorization URL. Open it in the browser logged in as the
// intended Google account, approve, and the loopback server here captures the
// code, exchanges it, and writes/prints the refresh_token.
import http from "node:http";
import { writeFileSync } from "node:fs";
import { OAuth2Client } from "google-auth-library";

const PORT = Number(process.env.OAUTH_PORT || 4300);
const REDIRECT_URI = `http://localhost:${PORT}`;
const SCOPES = ["https://www.googleapis.com/auth/adwords"];
const TOKEN_OUT = process.env.TOKEN_OUT || "./scripts/.refresh_token.tmp";

const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
if (!clientId || !clientSecret) {
  console.error("ERRO: defina GOOGLE_ADS_CLIENT_ID e GOOGLE_ADS_CLIENT_SECRET no ambiente.");
  process.exit(1);
}

const oauth2 = new OAuth2Client({ clientId, clientSecret, redirectUri: REDIRECT_URI });
const authUrl = oauth2.generateAuthUrl({
  access_type: "offline", // request a refresh_token
  prompt: "consent",       // force consent so a refresh_token is always returned
  scope: SCOPES,
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  if (url.pathname === "/favicon.ico") {
    res.writeHead(204);
    res.end();
    return;
  }
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");

  if (error) {
    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<h1>Autorização negada</h1><p>${error}</p>`);
    console.error("\nOAuth error:", error);
    server.close();
    process.exit(1);
  }
  if (!code) {
    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h1>Faltou o parâmetro code</h1>");
    return;
  }

  try {
    const { tokens } = await oauth2.getToken(code);
    const refreshToken = tokens.refresh_token;
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      `<html><body style="font-family:system-ui;padding:48px;max-width:520px;margin:auto">
        <h1 style="color:#2e7d32">✅ Autorizado</h1>
        <p>Refresh token gerado. Pode fechar esta aba e voltar ao terminal.</p>
      </body></html>`
    );
    if (refreshToken) {
      writeFileSync(TOKEN_OUT, refreshToken, "utf8");
      console.log("\n===REFRESH_TOKEN_START===");
      console.log(refreshToken);
      console.log("===REFRESH_TOKEN_END===");
      console.log(`\n(gravado em ${TOKEN_OUT})`);
    } else {
      console.error(
        "\nSem refresh_token na resposta. Isso acontece quando a conta já concedeu acesso antes.\n" +
          "Revogue em https://myaccount.google.com/permissions e rode de novo (prompt=consent já está setado)."
      );
    }
    server.close();
    setTimeout(() => process.exit(refreshToken ? 0 : 1), 250);
  } catch (e) {
    res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h1>Falha ao trocar o code pelo token</h1>");
    console.error("\nFalha na troca do code:", e?.message || e);
    server.close();
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log("\n================ AUTORIZE NO NAVEGADOR ================\n");
  console.log(authUrl);
  console.log(`\nServidor aguardando o callback em ${REDIRECT_URI} ...\n`);
});
