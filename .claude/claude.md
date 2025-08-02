# Claude Coding Best Practices

## Table of Contents
- [General Principles](#general-principles)
- [Project Setup & Context](#project-setup--context)
- [Code Generation](#code-generation)
- [Debugging & Troubleshooting](#debugging--troubleshooting)
- [Next.js 14 Specific](#nextjs-14-specific)
- [TypeScript Best Practices](#typescript-best-practices)
- [React Query Integration](#react-query-integration)
- [Socket.io Real-time Features](#socketio-real-time-features)
- [Code Review & Iteration](#code-review--iteration)

## General Principles

### Be Specific and Detailed
- Provide clear requirements and constraints
- Include expected input/output examples
- Specify error handling requirements
- Mention performance considerations upfront

### Provide Context
- Share your project structure and key dependencies
- Mention your target environment (Node.js version, browser support)
- Include relevant configuration files (tsconfig.json, next.config.js)
- Explain the broader feature or user story

### Use Examples
- Show existing code patterns from your project
- Provide sample data structures
- Include examples of desired API responses
- Share error scenarios you want to handle

## Project Setup & Context

### Initial Project Brief Template
```markdown
Project: [Brief description]
Tech Stack: Next.js 14, TypeScript, Tailwind CSS, React Query, Socket.io
Current task: [Specific feature/fix]
File structure: [Relevant parts]
Constraints: [Performance, accessibility, etc.]
```

### Share Relevant Files
- Include package.json dependencies
- Share configuration files when relevant
- Provide existing component examples
- Include API schemas or type definitions

### Environment Details
- Specify Node.js version
- Mention deployment target (Vercel, etc.)
- Include any specific build requirements
- Note browser support requirements

## Code Generation

### Request Structure
1. **Start with the goal**: "I need to create a user dashboard that..."
2. **Provide context**: "This fits into my existing app structure..."
3. **Specify requirements**: "It should handle loading states, errors, and..."
4. **Include constraints**: "Keep bundle size minimal, ensure accessibility..."

### Effective Prompts
```markdown
Good: "Create a TypeScript interface for a user profile with validation using Zod, including optional fields for social media links and a computed full name property."

Better: "Create a TypeScript interface for a user profile in my Next.js 14 app. Include: required fields (id, email, firstName, lastName), optional fields (avatar, bio, socialLinks), and methods for getFullName(). Use Zod for runtime validation. The socialLinks should be an array of {platform, url} objects."
```

### Code Organization Requests
- Ask for proper file structure suggestions
- Request component composition patterns
- Seek advice on state management architecture
- Get recommendations for folder organization

## Debugging & Troubleshooting

### Providing Error Information
- Include the complete error message
- Share the relevant code snippet
- Provide steps to reproduce
- Include browser/Node.js console output
- Share relevant configuration

### Systematic Debugging
1. **Isolate the problem**: Create minimal reproduction
2. **Check dependencies**: Verify versions and compatibility
3. **Review recent changes**: What was modified last?
4. **Test incrementally**: Build up complexity gradually

### Error Context Template
```markdown
Error: [Full error message]
File: [Filename and line number]
Context: [What you were trying to do]
Recent changes: [What was modified]
Environment: [Dev/prod, browser, Node version]
```

## Next.js 14 Specific

### App Router Best Practices
- Request server/client component guidance
- Ask for proper data fetching patterns
- Seek advice on layout optimization
- Get help with route organization

### Performance Optimization
- Ask for bundle analysis recommendations
- Request code splitting strategies
- Seek advice on image optimization
- Get help with caching strategies

### SEO and Meta Tags
- Request proper metadata implementation
- Ask for structured data guidance
- Seek advice on dynamic OG image generation
- Get help with sitemap generation

## TypeScript Best Practices

### Type Definition Requests
- Ask for proper interface vs type usage
- Request generic type implementations
- Seek advice on utility type usage
- Get help with complex type transformations

### Integration Patterns
- Request proper API response typing
- Ask for form validation type safety
- Seek advice on prop type definitions
- Get help with third-party library typing

### Advanced TypeScript
```markdown
"Create a type-safe API client for my Next.js app that:
- Uses generics for different endpoints
- Provides autocomplete for API routes
- Handles error responses consistently
- Integrates with React Query"
```

## React Query Integration

### Data Fetching Patterns
- Request proper query key strategies
- Ask for mutation handling patterns
- Seek advice on optimistic updates
- Get help with cache invalidation

### Error Handling
- Request consistent error boundaries
- Ask for retry logic implementation
- Seek advice on offline handling
- Get help with loading states

### Performance Optimization
```markdown
"Help me optimize my React Query setup for:
- Efficient cache management
- Proper background refetching
- Smart pagination
- Minimal re-renders"
```

## Socket.io Real-time Features

### Connection Management
- Request proper connection lifecycle handling
- Ask for reconnection strategies
- Seek advice on authentication integration
- Get help with room management

### Type Safety
- Request TypeScript integration for events
- Ask for proper event payload typing
- Seek advice on client-server type sharing
- Get help with event validation

### Real-time UI Patterns
```markdown
"Create a real-time notification system that:
- Integrates with Socket.io
- Uses React Query for optimistic updates
- Handles connection states gracefully
- Provides proper TypeScript typing"
```

## Code Review & Iteration

### Review Requests
- Ask for security vulnerability analysis
- Request performance bottleneck identification
- Seek advice on code organization improvements
- Get help with accessibility compliance

### Iterative Improvement
1. **Start simple**: Get basic functionality working
2. **Add complexity gradually**: Build features incrementally
3. **Refactor regularly**: Ask for code improvement suggestions
4. **Test thoroughly**: Request testing strategy guidance

### Code Quality Checklist
```markdown
Before considering code complete, ask Claude to review for:
- Type safety and proper TypeScript usage
- Error handling and edge cases
- Performance implications
- Accessibility compliance
- Security considerations
- Code organization and maintainability
```

## Common Patterns

### API Route Creation
```markdown
"Create a Next.js 14 API route that:
- Handles [HTTP method] requests
- Validates input using Zod
- Integrates with [database/service]
- Returns properly typed responses
- Includes error handling"
```

### Component Development
```markdown
"Create a React component that:
- Uses TypeScript for props
- Integrates with React Query for data
- Handles loading/error states
- Is accessible and responsive
- Follows our existing patterns in [example component]"
```

### State Management
```markdown
"Help me implement state management for:
- Complex form with validation
- Real-time data synchronization
- Optimistic UI updates
- Proper error boundaries"
```

## Tips for Better Collaboration

### Do's
- ✅ Provide complete context upfront
- ✅ Ask for explanations of complex solutions
- ✅ Request multiple approaches when appropriate
- ✅ Specify testing requirements
- ✅ Ask for documentation and comments

### Don'ts
- ❌ Ask for complete applications without context
- ❌ Ignore error messages or warnings
- ❌ Skip testing and validation steps
- ❌ Forget to specify constraints and requirements
- ❌ Assume Claude knows your exact project structure

## Continuous Learning

### Ask for Explanations
- Request explanations of complex patterns
- Ask about trade-offs between different approaches
- Seek advice on industry best practices
- Get help understanding new features or concepts

### Stay Updated
- Ask about latest Next.js features and patterns
- Request updates on TypeScript best practices
- Seek advice on emerging React patterns
- Get help with new library integrations

---
