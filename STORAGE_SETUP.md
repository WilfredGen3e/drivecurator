# Azure Storage instellen — Managed Identity

De API gebruikt Managed Identity om verbinding te maken met Azure Table Storage. Geen connection strings of sleutels nodig.

---

## Wat al gedaan is

- ✅ Azure Static Web App op Standard SKU
- ✅ System Assigned Managed Identity ingeschakeld op de SWA
- ✅ Managed Identity heeft de rol **Storage Table Data Contributor** op het Storage Account

---

## Stap 1 — Account naam instellen in Azure SWA

1. Ga naar je Static Web App in de Azure Portal
2. Linkermenu → **Configuration** → **+ Add**
3. Vul in:
   - **Name**: `AZURE_STORAGE_ACCOUNT_NAME`
   - **Value**: de naam van je Storage Account (bijv. `drivecuratorstore`)
4. **Save**

Dat is alles voor productie. Geen sleutels, geen connection strings.

---

## Stap 2 — Lokale ontwikkeling instellen

Lokaal gebruikt `DefaultAzureCredential` automatisch je Azure CLI-sessie.

1. Zorg dat de [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) geïnstalleerd is
2. Log in:
   ```bash
   az login
   ```
3. Kopieer het settings-bestand:
   ```bash
   cp api/local.settings.json.example api/local.settings.json
   ```
4. Vul je storage account naam in bij `AZURE_STORAGE_ACCOUNT_NAME`

Je Azure CLI-account heeft lokaal ook **Storage Table Data Contributor** nodig op het Storage Account (of gebruik het account dat al die rol heeft).

---

## Lokaal draaien

```bash
npm install -g azure-functions-core-tools@4 --unsafe-perm true
cd api && npm install
func start
```

API draait op `http://localhost:7071/api/`.
