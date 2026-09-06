# Manual Cloudflare release

All uploads, commits, and publishing are performed by the project owner. No deployment was performed during development. The application has no automatic deployment script attached to install, dev, test, or build.

## Local preview

Use `npm run dev`. `npm run build` produces Worker modules in `dist/worker/`, browser files in `dist/client/`, and the generated deployment configuration at `dist/wrangler.json`. The Cloudflare Vite plugin builds the Worker first, then the client, and sets the generated asset directory to `client`. Worker module discovery starts beside the generated entry point in `dist/worker/`, keeping browser bundles out of the Worker package. A post-build check validates that these directories do not overlap. The deployment configuration stays at `dist/wrangler.json`, so the dashboard and workflow deploy commands below remain valid. `npm run preview` previews the complete build locally.

The Worker forwards page-entry requests to the ASSETS binding and records request metadata. There is no database or server-rendered application. Run `npm run cf:typegen` after changing Worker bindings or the compatibility date; generated types live in `worker/worker-configuration.d.ts` and are checked separately from browser types.

## Cloudflare dashboard Git integration (Workers Builds)

When the owner connects this repository directly in Cloudflare, open the Worker's **Settings → Build** and use these values:

| Setting                                                       | Value                                                                                                  |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Build command                                                 | `npm run build`                                                                                        |
| Deploy command                                                | `npx wrangler deploy --config dist/wrangler.json`                                                      |
| Non-production branch deploy command, if previews are enabled | `npx wrangler versions upload --config dist/wrangler.json`                                             |
| Root directory                                                | Repository root, where `package.json` and `vite.config.ts` are located; leave the optional field blank |

Save the settings before manually retrying the failed build. Cloudflare installs dependencies before these commands; installing packages alone does not build the application. These dashboard settings are separate from the manually triggered GitHub Actions workflow below.

The build step is required. The Cloudflare Vite plugin fills `assets.directory` in the generated `dist/wrangler.json`. The root `wrangler.jsonc` is the plugin's input configuration and intentionally omits that directory. Running `npx wrangler deploy` in a fresh checkout before building produces the missing `assets.directory` error. Pointing the deploy command at the generated file also makes the configuration choice explicit.

Correcting the dashboard build command alone does not require a source change. Changes to the Worker or application still need the owner's manual source release and deployment. Keep `dist/` and `.wrangler/` out of Git; Cloudflare regenerates them during the build. If the log moves directly from dependency installation to deployment, check that the build command has been saved.

To verify the same configuration locally without uploading or publishing:

```sh
npm run build
npx wrangler deploy --dry-run --config dist/wrangler.json
```

## Page-request metrics and country logs

The `worker/index.ts` entry point runs before assets for `/` and `/index.html`. It forwards the original request to `env.ASSETS.fetch()` and returns the response directly, retaining streaming, headers, cache behavior, and status. Matching JavaScript, CSS, images, models, textures, and sounds keep the direct static-asset route. Assets served from a separate R2 origin also bypass this Worker.

After the owner manually deploys this source, new page-entry requests become Worker invocations visible in Cloudflare's Worker metrics. Open **Workers & Pages → mxs-unfold-studio** to inspect metrics and observability. In Workers Logs or Query Builder, filter custom logs to `event = page_request` and group by `country` or `status`. Each custom record contains:

- `event`: `page_request`
- `path`: `/` or `/index.html`
- `method`: the HTTP request method
- `country`: Cloudflare's country code, or `unknown` when unavailable locally
- `status`: the asset response status, or 500 if the binding throws
- `duration_ms`: elapsed time waiting for the asset response, not full page load time

Invocation logs and custom logs are enabled with a head sampling rate of 1. The custom record contains no client IP, headers, referrer, complete URL, or query string. Cloudflare's automatic invocation logs include their normal platform request metadata; `observability.redact_query_string` removes query strings from request URLs in logs and traces. No browser analytics script, identifier cookie, or Analytics Engine dataset is added. `send_metrics: false` disables Wrangler CLI telemetry only and does not disable these deployed Worker metrics.

These are request metrics, not unique-visitor counts. Reloads, bots, HEAD requests, and redirects can produce additional invocations; browser-cached visits may make no page request. Direct static-asset requests are not Worker invocations. Existing traffic is not backfilled, and log availability/retention follow the account's Cloudflare plan and limits. If future features add other page routes, add their exact patterns to `run_worker_first` and the page-log guard together.

## Manual GitHub Actions release

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

- https://developers.cloudflare.com/workers/ci-cd/builds/configuration/
- https://developers.cloudflare.com/workers/wrangler/commands/workers/#deploy

- https://developers.cloudflare.com/workers/vite-plugin/reference/static-assets/
- https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
- https://developers.cloudflare.com/cache/interaction-cloudflare-products/r2/
- https://developers.cloudflare.com/cache/concepts/default-cache-behavior/
- https://developers.cloudflare.com/r2/buckets/cors/

- https://developers.cloudflare.com/workers/static-assets/routing/worker-script/
- https://developers.cloudflare.com/workers/observability/metrics-and-analytics/
- https://developers.cloudflare.com/workers/observability/logs/workers-logs/
- https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/settings/methods/edit/
- https://developers.cloudflare.com/workers/vite-plugin/reference/vite-environments/
