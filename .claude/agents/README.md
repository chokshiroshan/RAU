# ContextSearch Specialized Agents

This directory contains specialized AI agents designed to handle specific aspects of ContextSearch development. Each agent has deep expertise in their domain and follows established patterns, best practices, and security guidelines.

## Agent Architecture Overview

The ContextSearch agent system is organized into three tiers:

1. **Core Architecture Agents** - Handle fundamental system components
2. **Feature Development Agents** - Manage specific feature implementations  
3. **Infrastructure Agents** - Oversee cross-cutting concerns

## Available Agents

### Core Architecture Agents

#### **🏗️ macOS Integration Agent** 
**File**: `macos-integration-agent.md`
- **Specialization**: macOS-specific features, AppleScript, system integration
- **Use for**: AppleScript development, macOS permissions, system services, native app packaging

#### **⚡ Electron Architecture Agent**
**File**: `electron-architecture-agent.md`  
- **Specialization**: Electron main process, IPC communication, window management
- **Use for**: Main process architecture, IPC patterns, window lifecycle, Electron Builder

#### **🎨 React UI Agent**
**File**: `react-ui-agent.md`
- **Specialization**: React components, state management, user interface
- **Use for**: Component architecture, keyboard navigation, Tailwind CSS, accessibility

### Feature Development Agents

#### **🌐 Browser Integration Agent**
**File**: `browser-integration-agent.md`
- **Specialization**: Browser tab functionality, AppleScript automation
- **Use for**: Tab enumeration/activation, browser support, AppleScript development

#### **🔍 Search Algorithms Agent**  
**File**: `search-algorithms-agent.md`
- **Specialization**: Search functionality, result ranking, performance
- **Use for**: Fuse.js configuration, multi-source search, result combination, fuzzy matching

#### **🧪 Testing Quality Agent**
**File**: `testing-quality-agent.md`
- **Specialization**: Testing strategy, test development, quality assurance
- **Use for**: Unit/integration testing, mock design, performance testing, CI/CD

### Infrastructure Agents

#### **🛡️ Security Audit Agent**
**File**: `security-audit-agent.md`
- **Specialization**: Security review, vulnerability assessment, secure coding practices
- **Use for**: IPC security validation, input sanitization, code injection prevention, compliance

#### **📦 Build Deploy Agent**
**File**: `build-deploy-agent.md`
- **Specialization**: Build processes, deployment automation, distribution
- **Use for**: Electron Builder configuration, code signing, CI/CD pipelines, release management

#### **⚡ Performance Agent**
**File**: `performance-agent.md`
- **Specialization**: Performance optimization, profiling, user experience
- **Use for**: Performance monitoring, memory management, startup optimization, UX enhancement

## Agent Selection Guide

### How to Choose the Right Agent

1. **Identify Your Task Domain**: Determine which area your work falls into
2. **Match to Specialization**: Select the agent with matching expertise
3. **Check Integration Points**: Consider if your task spans multiple domains
4. **Review Common Tasks**: Look at the agent's "Common Tasks" section

### Multi-Agent Collaboration

For complex tasks spanning multiple domains:

1. **Primary Agent**: Choose the agent most closely matching your primary task
2. **Secondary Agents**: Consult additional agents for cross-cutting concerns
3. **Integration Points**: Pay attention to integration notes and shared dependencies
4. **Security Review**: Always involve Security Audit Agent for security implications

### Example Scenarios

#### Adding New Browser Support
```
Primary: Browser Integration Agent (AppleScript, tab management)
Secondary: Testing Quality Agent (test coverage)
Consider: Security Audit Agent (AppleScript security)
```

#### Optimizing Search Performance
```
Primary: Performance Agent (performance optimization)
Secondary: Search Algorithms Agent (algorithm improvements)
Consider: Testing Quality Agent (performance testing)
```

#### Updating Build Process
```
Primary: Build Deploy Agent (build configuration)
Secondary: Security Audit Agent (code signing, security)
Consider: Performance Agent (build performance)
```

## Agent Characteristics

### Common Structure
Each agent follows a consistent structure:
- **Primary Responsibilities**: Core mission and scope
- **Core Expertise**: Deep domain knowledge areas
- **Key Files/Directories**: Relevant files and code organization
- **Common Tasks**: Typical work patterns and solutions
- **Testing Approach**: Testing strategy and validation methods
- **Integration Notes**: How the agent works with others
- **Common Pitfalls**: Known issues and solutions
- **When to Use**: Clear usage guidelines

### Quality Standards
- **Comprehensive Coverage**: Deep domain expertise with practical examples
- **Code Quality**: Production-ready code examples and patterns
- **Security Focus**: Security considerations integrated throughout
- **Performance Awareness**: Performance implications addressed
- **Testing Integration**: Testing strategies for all implementations
- **Practical Solutions**: Real-world solutions to common problems

### Security Integration
All agents integrate security considerations:
- **Input Validation**: Proper input sanitization and validation
- **Secure Patterns**: Security-focused coding practices
- **Vulnerability Prevention**: Proactive vulnerability avoidance
- **Compliance**: Adherence to security standards and best practices

## Usage Guidelines

### Best Practices
1. **Start with Architecture**: Use core architecture agents for foundational work
2. **Security First**: Always consider security implications with Security Audit Agent
3. **Test Thoroughly**: Involve Testing Quality Agent for comprehensive testing
4. **Performance Awareness**: Consider performance implications with Performance Agent
5. **Build Integration**: Use Build Deploy Agent for deployment and distribution

### Collaboration Patterns
- **Sequential**: Use agents in sequence for different phases of work
- **Concurrent**: Consult multiple agents for different aspects of the same task
- **Hierarchical**: Use core agents first, then feature/infrastructure agents
- **Iterative**: Revisit agents as requirements evolve

### Documentation Maintenance
- **Keep Current**: Update agent documentation as the codebase evolves
- **Add Patterns**: Document new patterns and solutions as they emerge
- **Share Knowledge**: Use agents to share domain knowledge across the team
- **Continuous Improvement**: Regularly review and improve agent documentation

## Getting Started

1. **Review Agents**: Read through available agents to understand their scope
2. **Identify Your Need**: Match your current task to the appropriate agent
3. **Follow Patterns**: Use the established patterns and solutions provided
4. **Integrate Security**: Always consider security implications
5. **Test Thoroughly**: Ensure comprehensive testing of your implementations

---

**These agents are designed to be your specialized development partners. Each one brings deep expertise in their domain while maintaining awareness of the broader system architecture and security requirements.**