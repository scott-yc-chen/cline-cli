#!/usr/bin/env node

const esbuild = require("esbuild")
const fs = require("fs-extra")
const path = require("path")

async function build() {
	// Clean dist directory
	await fs.remove("dist")
	await fs.ensureDir("dist")

	try {
		// Build the CLI application
		await esbuild.build({
			entryPoints: ["src/index.ts"],
			bundle: true,
			platform: "node",
			target: "node18",
			format: "cjs",
			outfile: "dist/index.js",
			external: [
				// Node built-ins
				"fs",
				"path",
				"os",
				"crypto",
				"util",
				"events",
				"stream",
				// CLI-specific externals that should be resolved at runtime
				"node-pty",
			],
			tsconfig: "../tsconfig.json",
			alias: {
				"@": path.resolve(__dirname, "../src"),
				"@api": path.resolve(__dirname, "../src/core/api"),
				"@core": path.resolve(__dirname, "../src/core"),
				"@generated": path.resolve(__dirname, "../src/generated"),
				"@hosts": path.resolve(__dirname, "../src/hosts"),
				"@integrations": path.resolve(__dirname, "../src/integrations"),
				"@packages": path.resolve(__dirname, "../src/packages"),
				"@services": path.resolve(__dirname, "../src/services"),
				"@shared": path.resolve(__dirname, "../src/shared"),
				"@utils": path.resolve(__dirname, "../src/utils"),
			},
			define: {
				"process.env.NODE_ENV": '"production"',
			},
			banner: {
				js: "#!/usr/bin/env node",
			},
			sourcemap: true,
			minify: false, // Keep readable for debugging
		})

		// Make the output executable
		await fs.chmod("dist/index.js", 0o755)

		console.log("✅ CLI build completed successfully")
		console.log("📁 Output: dist/index.js")
		console.log("🚀 Run: npm start")
	} catch (error) {
		console.error("❌ Build failed:", error)
		process.exit(1)
	}
}

build()
