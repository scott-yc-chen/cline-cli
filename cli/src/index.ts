#!/usr/bin/env node

import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import { App } from './ui/App.js';

const program = new Command();

program
  .name('cline')
  .description('Cline AI coding assistant for the command line')
  .version('1.0.0');

program
  .argument('[task]', 'Task to execute')
  .option('-m, --model <model>', 'AI model to use')
  .option('-k, --api-key <key>', 'API key for the AI service')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('-d, --debug', 'Enable debug mode')
  .action(async (task, options) => {
    try {
      // Render the Ink-based CLI application
      const { waitUntilExit } = render(
        React.createElement(App, {
          initialTask: task,
          model: options.model,
          apiKey: options.apiKey,
          configPath: options.config,
          debug: options.debug,
        })
      );

      // Wait for the application to exit
      await waitUntilExit();
    } catch (error) {
      console.error('Error starting Cline CLI:', error);
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Configure Cline CLI settings')
  .option('--model <model>', 'Set default AI model')
  .option('--api-key <key>', 'Set API key')
  .option('--list', 'List current configuration')
  .action(async (options) => {
    // TODO: Implement configuration management
    console.log('Configuration management coming soon...');
  });

program
  .command('init')
  .description('Initialize Cline in the current project')
  .action(async () => {
    // TODO: Implement project initialization
    console.log('Project initialization coming soon...');
  });

program
  .command('history')
  .description('View chat history')
  .action(async () => {
    // TODO: Implement history viewing
    console.log('History viewing coming soon...');
  });

program
  .command('status')
  .description('Show current session status')
  .action(async () => {
    // TODO: Implement status display
    console.log('Status display coming soon...');
  });

// Parse command line arguments
program.parse();