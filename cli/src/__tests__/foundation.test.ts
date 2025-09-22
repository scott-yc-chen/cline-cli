import "../test/setup"
import "should"
import fs from "fs-extra"
import path from "path"

describe("CLI Foundation (Phase 1)", () => {
	describe("Package Configuration", () => {
		it("should have correct package.json structure", async () => {
			const packagePath = path.join(__dirname, "..", "..", "package.json")
			const packageExists = await fs.pathExists(packagePath)
			packageExists.should.be.true()

			const pkg = await fs.readJson(packagePath)
			pkg.name.should.equal("cline-cli")
			pkg.should.have.property("bin")
			pkg.bin.should.have.property("cline")
		})

		it("should have required dependencies", async () => {
			const packagePath = path.join(__dirname, "..", "..", "package.json")
			const pkg = await fs.readJson(packagePath)

			// Check key CLI dependencies
			pkg.dependencies.should.have.property("ink")
			pkg.dependencies.should.have.property("react")
			pkg.dependencies.should.have.property("commander")
			pkg.dependencies.should.have.property("chalk")
			pkg.dependencies.should.have.property("execa")
		})

		it("should have test infrastructure", async () => {
			const packagePath = path.join(__dirname, "..", "..", "package.json")
			const pkg = await fs.readJson(packagePath)

			// Verify basic test infrastructure exists
			pkg.should.have.property("devDependencies")
			pkg.should.have.property("scripts")

			// Basic existence checks
			const hasTestScript = "test" in (pkg.scripts || {})
			const hasMocha = "mocha" in (pkg.devDependencies || {})

			hasTestScript.should.be.true()
			hasMocha.should.be.true()
		})
	})

	describe("Directory Structure", () => {
		it("should have required source directories", async () => {
			const srcDir = path.join(__dirname, "..")
			const dirExists = await fs.pathExists(srcDir)
			dirExists.should.be.true()

			// Check key directories exist
			const hostsDir = path.join(srcDir, "hosts")
			const uiDir = path.join(srcDir, "ui")
			const utilsDir = path.join(srcDir, "utils")
			const providersDir = path.join(srcDir, "providers")

			const hostsDirExists = await fs.pathExists(hostsDir)
			const uiDirExists = await fs.pathExists(uiDir)
			const utilsDirExists = await fs.pathExists(utilsDir)
			const providersDirExists = await fs.pathExists(providersDir)

			hostsDirExists.should.be.true()
			uiDirExists.should.be.true()
			utilsDirExists.should.be.true()
			providersDirExists.should.be.true()
		})

		it("should have main entry point", async () => {
			const entryPoint = path.join(__dirname, "..", "index.ts")
			const entryExists = await fs.pathExists(entryPoint)
			entryExists.should.be.true()
		})

		it("should have TypeScript configuration", async () => {
			const tsconfigPath = path.join(__dirname, "..", "..", "tsconfig.json")
			const tsconfigExists = await fs.pathExists(tsconfigPath)
			tsconfigExists.should.be.true()

			const tsconfig = await fs.readJson(tsconfigPath)
			tsconfig.should.have.property("compilerOptions")
		})
	})

	describe("Test Infrastructure", () => {
		it("should have test setup file", async () => {
			const setupPath = path.join(__dirname, "..", "test", "setup.ts")
			const setupExists = await fs.pathExists(setupPath)
			setupExists.should.be.true()
		})

		it("should have mocha configuration", async () => {
			const mochaPath = path.join(__dirname, "..", "..", ".mocharc.json")
			const mochaExists = await fs.pathExists(mochaPath)
			mochaExists.should.be.true()

			const mochaConfig = await fs.readJson(mochaPath)
			mochaConfig.should.have.property("require")
			mochaConfig.should.have.property("spec")
		})
	})

	describe("CLI Entry Point Structure", () => {
		it("should export entry point file structure", async () => {
			const entryPath = path.join(__dirname, "..", "index.ts")
			const content = await fs.readFile(entryPath, "utf8")

			// Check for key imports and structure
			content.should.containEql("commander")
			content.should.containEql("ink")
			content.should.containEql("React")
			content.should.containEql("program.parse()")
		})
	})
})