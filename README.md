# Cordova Android CI — GitHub Actions

Template de GitHub Actions pentru build automat APK & AAB semnat dintr-un proiect **Apache Cordova**.

---

## Workflow-uri incluse

| Fișier | Scop |
|--------|------|
| `1. generate-keystore.yml` | Generează un keystore de semnare (rulează **o singură dată**) |
| `2. build-android.yml` | Compilează APK debug + AAB release, cu semnare opțională |

---

## Ghid pas cu pas

### Pasul 1 — Copiază workflow-urile în proiectul tău

```
.github/
  workflows/
    generate-keystore.yml
    build-android.yml
```

### Pasul 2 — Configurează directorul aplicației

Deschide `build-android.yml` și modifică variabila `APP_DIR` să corespundă cu directorul proiectului tău Cordova:

```yaml
env:
  APP_DIR: 'rummy-app'   # ← schimbă cu directorul tău
```

### Pasul 3 — Generează keystore-ul de semnare

1. Du-te la **GitHub → Actions → "1. Generare Keystore"**
2. Click pe **"Run workflow"**
3. Completează câmpurile:
   - **Parola keystore** — alege o parolă puternică (minim 6 caractere)
   - **Alias cheie** — un nume scurt pentru cheie (ex: `my-app`)
   - **Parola cheie** — poate fi identică cu parola keystore
   - **Numele tău** — ex: `Ion Popescu`
   - **Organizație** — ex: `MyOrg` (opțional)
   - **Cod țară** — `RO` pentru România
4. Click **"Run workflow"** și așteaptă să se termine
5. Deschide log-ul job-ului și **copiază** șirul lung de text afișat între cele două linii `=====`

> ⚠️ **Important:** Descarcă și keystore-ul din Artifacts! Păstrează-l într-un loc sigur — fără el nu poți publica actualizări ale aplicației pe Play Store.

### Pasul 4 — Adaugă secretele în GitHub

Du-te la **Settings → Secrets and variables → Actions → New repository secret** și adaugă:

| Nume secret | Valoare |
|-------------|---------|
| `KEYSTORE_BASE64` | Șirul base64 copiat la pasul 3 |
| `KEYSTORE_PASSWORD` | Parola keystore aleasă la pasul 3 |
| `KEY_ALIAS` | Aliasul ales la pasul 3 (ex: `my-app`) |
| `KEY_PASSWORD` | Parola cheii aleasă la pasul 3 |

### Pasul 5 — Build automat

De acum, la orice push pe `main` sau `master`, workflow-ul `build-android.yml` va:

1. Compila un **APK debug** → disponibil în Artifacts ca `app-debug-apk`
2. Compila un **AAB release nesemnat** → disponibil în Artifacts ca `app-release-aab-unsigned`
3. **Semna AAB-ul** (dacă secretele sunt configurate) → disponibil în Artifacts ca `app-release-aab-signed`

---

## Cerințe în `config.xml`

Asigură-te că proiectul Cordova vizează cel puțin API 35 (cerință Google Play):

```xml
<preference name="android-minSdkVersion" value="24" />
<preference name="android-targetSdkVersion" value="35" />
```

---

## Structura proiectului Cordova așteptată

```
<APP_DIR>/
├── config.xml
├── www/
│   └── index.html
└── platforms/        ← generat automat de Cordova
```

---

## Întrebări frecvente

**Q: Pot folosi un keystore existent?**
Sari peste pasul 3. Codifică-l manual cu `base64 -w 0 my.keystore` și adaugă-l ca secret `KEYSTORE_BASE64`.

**Q: Unde găsesc APK-ul/AAB-ul după build?**
GitHub → Actions → selectează rularea → secțiunea **Artifacts** din josul paginii.

**Q: Cât timp sunt păstrate artifact-urile?**
30 de zile (keystore-ul generat se șterge după 1 zi din motive de securitate).
