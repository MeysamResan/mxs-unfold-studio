# Manual Cloudflare release

All uploads, commits, and publishing are performed by the project owner. No deployment was performed during development. The application has no automatic deployment script attached to install, dev, test, or build.

## Local preview

Use `npm run dev`. `npm run build` produces the static output and Cloudflare deployment configuration in `dist/`. `npm run preview` previews the build locally. The Cloudflare Vite plugin supplies its generated deployment configuration; there is no application backend or database.

## GitHub → Cloudflare

The supplied workflow `.github/workflows/release.yml` has **only `workflow_dispatch`**. A push or pull request cannot trigger it. The project owner manually commits/pushes the files, configures the repository secrets, and chooses **Run workflow** to publish.

Required GitHub secrets:

- `CLOUDFLARE_API_TOKEN`: a scoped token for Workers deployment.
- `CLOUDFLARE_ACCOUNT_ID`: the target account.

The workflow installs the lockfile dependencies, checks types/tests, builds, and invokes Cloudflare's official Wrangler action. It does not upload assets to R2; those are separate owner-controlled releases.

## R2 media delivery

The local starter includes its small versioned GLB so it works immediately. For the growing public library, use an R2 Standard bucket with a production custom domain. Set the workflow's `asset_base_url` input to that public HTTPS origin. `VITE_ASSET_BASE_URL` is embedded in the client and must never contain a credential.

The owner uploads the exact media files at their versioned paths before releasing catalogue records referencing them. For example, the manifest path `/media/models/<filename>.glb` must exist at the same path beneath the asset origin. The release check verifies expected file URLs and lengths before publication when an asset origin is supplied.

- Use content-hashed filenames and `Cache-Control: public, max-age=31536000, immutable` for immutable model/texture/audio assets.
- Add a Cloudflare Cache Rule covering public GLB/glTF/KTX2 media paths. These formats are not all cached by default merely because a custom domain is attached.
- Set the correct content type and CORS for the app's production origin. Add only intended preview/development origins.
- Keep HTML and mutable catalogue responses revalidated. Retain old immutable assets for active sessions and rollbacks.
- Keep R2 source/master backups and release retention policies explicit. An asset delivery bucket is not a complete source-versioning plan.

Use a production asset domain rather than `r2.dev`. No bucket, domain, token, GitHub connection, or remote resource is created by this project setup.

## References

- https://developers.cloudflare.com/workers/vite-plugin/reference/static-assets/
- https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
- https://developers.cloudflare.com/cache/interaction-cloudflare-products/r2/
- https://developers.cloudflare.com/cache/concepts/default-cache-behavior/
- https://developers.cloudflare.com/r2/buckets/cors/
