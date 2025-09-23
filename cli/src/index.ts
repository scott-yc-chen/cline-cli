#!/usr/bin/env tsx

import { Command } from "commander"
import { render } from "ink"
import React from "react"
import { App } from "./ui/App"

const program = new Command()

program.name("cline").description("Cline AI coding assistant for the command line").version("1.0.0")

program
	.argument("[task]", "Task to execute")
	.option("-m, --model <model>", "AI model to use")
	.option("-k, --api-key <key>", "API key for the AI service")
	.option("-u, --api-url <url>", "API URL for OpenAI-compatible services")
	.option("-c, --config <path>", "Path to configuration file")
	.option("-d, --debug", "Enable debug mode")
	.action(async (task, options) => {
		try {
			// Environment variable fallbacks
			const model = options.model || process.env.OPENAI_MODEL || process.env.CLINE_MODEL
			const apiKey = options.apiKey || process.env.OPENAI_API_KEY || process.env.CLINE_API_KEY
			const apiUrl = options.apiUrl || process.env.OPENAI_API_BASE || process.env.CLINE_API_URL

			// Render the Ink-based CLI application
			const { waitUntilExit } = render(
				React.createElement(App, {
					initialTask: task,
					model,
					apiKey,
					apiUrl,
					configPath: options.config,
					debug: options.debug,
				}),
			)

			// Wait for the application to exit
			await waitUntilExit()
		} catch (error) {
			console.error("Error starting Cline CLI:", error)
			process.exit(1)
		}
	})

program
	.command("config")
	.description("Configure Cline CLI settings")
	.option("--model <model>", "Set default AI model")
	.option("--api-key <key>", "Set API key")
	.option("--api-url <url>", "Set API URL")
	.option("--list", "List current configuration")
	.action(async (_options) => {
		// TODO: Implement configuration management
		console.log("Configuration management coming soon...")
	})

program
	.command("init")
	.description("Initialize Cline in the current project")
	.action(async () => {
		// TODO: Implement project initialization
		console.log("Project initialization coming soon...")
	})

program
	.command("history")
	.description("View chat history")
	.action(async () => {
		// TODO: Implement history viewing
		console.log("History viewing coming soon...")
	})

program
	.command("status")
	.description("Show current session status")
	.action(async () => {
		// TODO: Implement status display
		console.log("Status display coming soon...")
	})

// Parse command line arguments
program.parse()
