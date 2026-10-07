# Save the code in your GitHub account

1. Download and unzip `paan-party-source.zip`.
2. Sign in to <https://github.com> and create a repository named `paan-party`. Choose **Private** if you want to keep your business source and branding private.
3. Choose **uploading an existing file** or **Add file > Upload files**.
4. Upload the contents of the extracted `paan-party` directory, so `package.json`, `README.md` and `src/` are at the repository root. Upload the contents, not the ZIP itself.
5. Commit the files. Include `.gitignore` and `.github/workflows/build.yml`; file pickers sometimes hide dot-prefixed paths.

## Alternatively, use Git

Create an empty GitHub repository without adding a README, license or gitignore. In the extracted project directory, replace `YOUR_USERNAME` below:

```bash
git init
git add .
git commit -m "Add Paan Party Angular invoice app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/paan-party.git
git push -u origin main
```

GitHub prompts for authentication as needed. No password or token is included.

Open the repository's **Actions** tab to see the checks/build. This workflow does not publish the app; follow `CLOUDFLARE.md` for hosting.

To run after cloning:

```bash
git clone https://github.com/YOUR_USERNAME/paan-party.git
cd paan-party
npm ci
npm run dev
```
