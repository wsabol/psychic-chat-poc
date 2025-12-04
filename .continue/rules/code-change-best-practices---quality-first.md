---
alwaysApply: true
---

BEFORE making ANY code changes:
1. Read the entire file to understand current state
2. Identify ALL affected files in the change (HTML, CSS, JS, Docker, configs)
3. Think through the full stack impact
4. Plan ALL changes needed in one session, not incrementally
5. Make changes in logical order (foundational first)

WHEN making changes:
1. Use read_file first to verify current state
2. Plan multi_edit operations completely before executing
3. Verify each file is correct after editing
4. Test the complete solution, not just one piece

AVOID:
- Repeated failed attempts at same fix (read error, plan, execute once)
- Partial fixes that need multiple iterations
- Making changes without understanding root cause first
- Assuming Docker/containers have updated without rebuild
- Using commands incompatible with PowerShell on Windows

DOCKER LESSONS:
- Always: docker-compose down first
- Always: docker image rm -f image-name before rebuild
- Always: docker-compose build --no-cache for CSS/config changes
- Always: Wait 20 seconds for startup before testing
- Always: Hard refresh (Ctrl+Shift+R) browser cache before testing

CSS/RESPONSIVE LESSONS:
- Viewport meta tag is CRITICAL for media queries on mobile
- Reset CSS needed: *, html, body, #root sizing
- Check overflow hidden on parent elements
- Media queries must hide/show correctly with !important when needed
- Test on actual device sizes (375px, 768px, 1024px, 1440px)

ALWAYS verify: index.html viewport, index.css reset, media queries, Docker config before rebuilding.