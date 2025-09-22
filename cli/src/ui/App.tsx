import React, { useState, useEffect } from 'react';
import { Box, Text, Newline } from 'ink';
import { ChatInterface } from './ChatInterface.js';
import { LoadingSpinner } from './LoadingSpinner.js';

interface AppProps {
  initialTask?: string;
  model?: string;
  apiKey?: string;
  configPath?: string;
  debug?: boolean;
}

export const App: React.FC<AppProps> = ({
  initialTask,
  model,
  apiKey,
  configPath,
  debug = false,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        // TODO: Initialize the CLI host bridge and core systems
        await new Promise(resolve => setTimeout(resolve, 1000)); // Temporary delay
        setIsInitialized(true);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {error}</Text>
        <Newline />
        <Text color="gray">Please check your configuration and try again.</Text>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box flexDirection="column">
        <LoadingSpinner text="Initializing Cline CLI..." />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height={process.stdout.rows}>
      <Box borderStyle="round" borderColor="blue" padding={1}>
        <Text color="blue" bold>
          🤖 Cline CLI - AI Coding Assistant
        </Text>
      </Box>

      <ChatInterface
        initialTask={initialTask}
        model={model}
        debug={debug}
      />
    </Box>
  );
};