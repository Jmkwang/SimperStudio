import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatMessageBubble } from '../ChatMessageBubble';
import { ChatMessage } from '@/types/models';

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'msg-1',
    sessionId: 'sess-1',
    role: 'assistant',
    content: { text: '' },
    agentResponses: [],
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('ChatMessageBubble - multiple agentResponses', () => {
  it('should render all agent responses when no filter applied', () => {
    const message = makeMessage({
      agentResponses: [
        { agentId: 'a1', content: { text: 'Agent 1 reply' }, status: 'complete', timestamp: Date.now() },
        { agentId: 'a2', content: { text: 'Agent 2 reply' }, status: 'complete', timestamp: Date.now() },
        { agentId: 'a3', content: { text: 'Agent 3 reply' }, status: 'complete', timestamp: Date.now() },
      ],
    });

    render(<ChatMessageBubble message={message} />);

    expect(screen.getByText('Agent 1 reply')).toBeDefined();
    expect(screen.getByText('Agent 2 reply')).toBeDefined();
    expect(screen.getByText('Agent 3 reply')).toBeDefined();
  });

  it('should filter by agentId when provided', () => {
    const message = makeMessage({
      agentResponses: [
        { agentId: 'a1', content: { text: 'Agent 1 reply' }, status: 'complete', timestamp: Date.now() },
        { agentId: 'a2', content: { text: 'Agent 2 reply' }, status: 'complete', timestamp: Date.now() },
      ],
    });

    render(<ChatMessageBubble message={message} agentId="a1" />);

    expect(screen.getByText('Agent 1 reply')).toBeDefined();
    expect(screen.queryByText('Agent 2 reply')).toBeNull();
  });

  it('should filter by nodeId when provided', () => {
    const message = makeMessage({
      agentResponses: [
        { agentId: 'a1', nodeId: 'n1', content: { text: 'Node 1 reply' }, status: 'complete', timestamp: Date.now() },
        { agentId: 'a1', nodeId: 'n2', content: { text: 'Node 2 reply' }, status: 'complete', timestamp: Date.now() },
      ],
    });

    render(<ChatMessageBubble message={message} nodeId="n2" />);

    expect(screen.queryByText('Node 1 reply')).toBeNull();
    expect(screen.getByText('Node 2 reply')).toBeDefined();
  });

  it('should filter by both agentId and nodeId', () => {
    const message = makeMessage({
      agentResponses: [
        { agentId: 'a1', nodeId: 'n1', content: { text: 'A1-N1' }, status: 'complete', timestamp: Date.now() },
        { agentId: 'a1', nodeId: 'n2', content: { text: 'A1-N2' }, status: 'complete', timestamp: Date.now() },
        { agentId: 'a2', nodeId: 'n1', content: { text: 'A2-N1' }, status: 'complete', timestamp: Date.now() },
      ],
    });

    render(<ChatMessageBubble message={message} agentId="a1" nodeId="n1" />);

    expect(screen.getByText('A1-N1')).toBeDefined();
    expect(screen.queryByText('A1-N2')).toBeNull();
    expect(screen.queryByText('A2-N1')).toBeNull();
  });

  it('should render user message bubble', () => {
    const message = makeMessage({
      role: 'user',
      content: { text: 'Hello world' },
      agentResponses: undefined,
    });

    render(<ChatMessageBubble message={message} />);

    expect(screen.getByText('Hello world')).toBeDefined();
  });

  it('should show emptyText when user message has no text', () => {
    const message = makeMessage({
      role: 'user',
      content: { text: '' },
      agentResponses: undefined,
    });

    render(<ChatMessageBubble message={message} emptyText="No content" />);

    expect(screen.getByText('No content')).toBeDefined();
  });

  it('should render agent name fallback in avatar', () => {
    const message = makeMessage({
      agentResponses: [
        { agentId: 'a1', content: { text: 'Reply' }, status: 'complete', timestamp: Date.now() },
      ],
    });

    const { container } = render(
      <ChatMessageBubble message={message} agent={{ name: 'TestBot' }} />
    );

    expect(container.textContent).toContain('Te'); // first 2 chars of name
  });
});
