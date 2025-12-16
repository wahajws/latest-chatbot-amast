# UI Specification - ChatGPT Clone

## Overview
The user interface must be **EXACTLY** identical to OpenAI ChatGPT. Every visual element, interaction, animation, and behavior must match ChatGPT's interface precisely.

## Layout Structure

### Left Sidebar (Collapsible)
- **Position**: Fixed left side of viewport
- **Width**: 
  - Expanded: ~260px
  - Collapsed: ~60px (icon-only mode)
- **Background Color**: #202123 or #171717 (dark gray/black)
- **Height**: Full viewport height
- **Z-index**: High (above main content)

#### Sidebar Components (Top to Bottom):

1. **"+ New chat" Button**
   - Position: Top of sidebar, below header (if any)
   - Style: Green/primary button (#10A37F or ChatGPT's primary color)
   - Text: "+ New chat" or "+" icon with text
   - Behavior: Creates new session, clears current chat
   - Hover: Slight color change
   - Padding: 12px-16px

2. **Session List**
   - Scrollable container
   - Each session item:
     - Background: Transparent (dark sidebar background)
     - Hover: Slight background highlight (#2F2F2F or similar)
     - Padding: 12px-16px
     - Border radius: 6px on hover
     - Display:
       - Title (truncated with ellipsis if too long)
       - Optional: Last message preview or timestamp
     - Active session: Highlighted background
     - Actions on hover:
       - Edit icon (pencil)
       - Delete icon (trash)
       - Appear on right side of item

3. **User Profile Section** (Bottom)
   - Fixed at bottom of sidebar
   - User avatar/name
   - Settings icon/link
   - Logout button
   - Background: Slightly different shade or border top

4. **Collapse/Expand Toggle**
   - Icon button (hamburger or arrow)
   - Position: Top-right or bottom
   - Smooth animation when toggling

### Main Chat Area

- **Layout**: Centered content with max-width
- **Max Width**: ~768px-900px (ChatGPT's width)
- **Background**: #FFFFFF or #F7F7F8 (light gray/white)
- **Padding**: 0 (messages handle their own padding)
- **Margin**: Auto (centered)

#### Message Display

**User Messages**:
- Alignment: Right-aligned
- Background: #FFFFFF or #F7F7F8
- Border: Subtle border or shadow
- Border Radius: 18px-20px (rounded corners)
- Padding: 16px-20px
- Margin: 16px-20px (vertical spacing between messages)
- Max Width: ~80% of chat area
- Text Color: #353740 or #2D333A
- Font Size: 16px
- Line Height: 1.5-1.75

**Assistant Messages**:
- Alignment: Left-aligned
- Background: #F7F7F8 or #FFFFFF with subtle border
- Border: Very subtle border (#E5E5E5)
- Border Radius: 18px-20px
- Padding: 16px-20px
- Margin: 16px-20px
- Max Width: ~85% of chat area
- Text Color: #353740
- Font Size: 16px
- Line Height: 1.5-1.75

**Message Actions** (Appear on hover):
- Copy button (icon)
- Edit button (for user messages)
- Regenerate button (for assistant messages)
- Thumbs up/down (optional)
- Position: Top-right of message bubble

**Code Blocks** (in assistant messages):
- Background: #F6F6F6 or #F7F7F8
- Border: 1px solid #E5E5E5
- Border Radius: 6px-8px
- Padding: 12px-16px
- Font Family: Monospace (Consolas, Monaco, 'Courier New')
- Font Size: 14px
- Syntax Highlighting: Required
- Copy Button: Top-right of code block (appears on hover)

**Markdown Elements**:
- Headers: Proper sizing and weight
- Lists: Proper indentation and bullets
- Links: Blue color, underlined on hover
- Tables: Styled with borders and padding
- Blockquotes: Left border, italic text
- Inline code: Background highlight, monospace font

### Input Area (Bottom)

- **Position**: Fixed at bottom of viewport
- **Background**: #FFFFFF
- **Border**: 1px solid #E5E5E5 or subtle shadow
- **Border Radius**: 12px-16px (rounded corners)
- **Padding**: 12px-16px
- **Max Width**: Same as chat area (centered)
- **Margin**: 16px-20px from bottom
- **Layout**: Flexbox with input and send button

**Text Input**:
- Border: None (or very subtle)
- Background: Transparent
- Font Size: 16px
- Padding: 8px-12px
- Placeholder: "Message..." or similar
- Resize: Auto-grow (multi-line support)
- Max Height: ~200px (then scroll)

**Send Button**:
- Position: Right side of input
- Icon: Arrow/paper plane
- Background: Primary color or transparent
- Size: 32px-40px
- Border Radius: 50% (circle) or rounded
- Disabled State: Grayed out, non-clickable
- Hover: Slight color change

**Loading State**:
- Input disabled
- Send button shows spinner or loading icon
- Typing indicator in chat area

## Color Palette (Exact ChatGPT Colors)

### Light Mode (Default)
- **Background**: #FFFFFF or #F7F7F8
- **Sidebar**: #202123 or #171717
- **Primary/Accent**: #10A37F (green) or ChatGPT's exact primary
- **Text Primary**: #353740 or #2D333A
- **Text Secondary**: #6E6E80
- **Border**: #E5E5E5 or #D1D5DB
- **User Message BG**: #FFFFFF
- **Assistant Message BG**: #F7F7F8
- **Hover Background**: #F0F0F0 or #2F2F2F (sidebar)
- **Code Block BG**: #F6F6F6
- **Link Color**: #2563EB (blue)

### Dark Mode (Optional, but match ChatGPT if implemented)
- Use ChatGPT's exact dark mode colors if implementing

## Typography

### Font Family
```
System fonts: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif
Monospace: "Consolas", "Monaco", "Courier New", monospace
```

### Font Sizes
- **Chat Messages**: 16px (base)
- **Sidebar Items**: 14px
- **Headers**: 18px-20px
- **Code Blocks**: 14px
- **Small Text**: 12px-13px

### Font Weights
- **Regular**: 400
- **Medium**: 500
- **Semibold**: 600
- **Bold**: 700

### Line Heights
- **Body Text**: 1.5-1.75
- **Code**: 1.4-1.6
- **Headers**: 1.2-1.4

## Spacing & Sizing

### Padding
- **Messages**: 16px-24px (internal)
- **Input**: 12px-16px
- **Sidebar Items**: 12px-16px
- **Code Blocks**: 12px-16px

### Margins
- **Between Messages**: 16px-20px (vertical)
- **Chat Area**: Auto (centered)
- **Input from Bottom**: 16px-20px

### Border Radius
- **Messages**: 18px-20px
- **Input**: 12px-16px
- **Code Blocks**: 6px-8px
- **Buttons**: 6px-8px or 50% (circular)

### Widths
- **Sidebar Expanded**: ~260px
- **Sidebar Collapsed**: ~60px
- **Chat Area Max**: ~768px-900px
- **Message Max Width**: 80-85% of chat area

## Animations & Transitions

### Timing
- **Standard Transition**: 0.2s-0.3s
- **Smooth Scroll**: 0.3s-0.5s
- **Fade In**: 0.2s-0.4s

### Animations
1. **Message Appearance**: Fade in from bottom
2. **Typing Indicator**: Three dots bouncing (1s loop)
3. **Sidebar Toggle**: Smooth width transition
4. **Hover Effects**: Background color transition
5. **Loading Spinner**: Rotating animation
6. **Button Click**: Slight scale or color change

### Easing
- **Ease-out**: For most transitions
- **Ease-in-out**: For complex animations
- **Cubic-bezier**: Match ChatGPT's exact easing

## Interactions

### Hover States
- **Sidebar Items**: Background color change (#2F2F2F)
- **Buttons**: Slight color change or scale
- **Messages**: Show action buttons (copy, edit, etc.)
- **Links**: Underline or color change
- **Input**: Subtle border color change

### Click States
- **Active**: Slight scale or color change
- **Focus**: Border highlight or outline
- **Disabled**: Grayed out, no interaction

### Keyboard Navigation
- **Enter**: Send message (Shift+Enter for new line)
- **Escape**: Close modals or cancel actions
- **Tab**: Navigate between elements
- **Arrow Keys**: Navigate session list (optional)

## Responsive Design

### Mobile (< 768px)
- **Sidebar**: Overlay/drawer (slides in from left)
- **Chat Area**: Full width (minus padding)
- **Input**: Full width (minus padding)
- **Touch Targets**: Minimum 44px x 44px
- **Swipe Gestures**: Open/close sidebar

### Tablet (768px - 1024px)
- **Sidebar**: Collapsible (default collapsed or expanded based on preference)
- **Chat Area**: Centered with max-width
- **Input**: Centered with max-width

### Desktop (> 1024px)
- **Sidebar**: Always visible (unless manually collapsed)
- **Chat Area**: Centered with max-width
- **Input**: Centered with max-width

## Loading States

### Typing Indicator
- **Appearance**: Three animated dots
- **Position**: Below last message (left-aligned)
- **Animation**: Dots bounce sequentially
- **Background**: Same as assistant message
- **Padding**: 16px-20px

### Message Loading
- **Skeleton**: Placeholder with shimmer effect
- **Fade In**: When message appears
- **Smooth Transition**: No jarring appearance

### Button Loading
- **Spinner**: Rotating icon
- **Disabled State**: Non-clickable
- **Visual Feedback**: Clear loading indication

## Error States

### Error Messages
- **Display**: Inline with messages
- **Style**: Red text or red border
- **Icon**: Error icon (optional)
- **Action**: Retry button
- **Position**: Below failed message

### Network Errors
- **Toast/Notification**: Subtle notification
- **Retry Option**: Automatic or manual
- **User Feedback**: Clear error message

## Accessibility

### ARIA Labels
- All interactive elements have proper labels
- Screen reader support
- Keyboard navigation indicators

### Focus Indicators
- Visible focus outline
- Keyboard navigation support
- Skip links for main content

### Color Contrast
- WCAG AA compliance (minimum)
- High contrast mode support
- Color-blind friendly

## Implementation Notes

1. **Study ChatGPT**: Open ChatGPT in browser and inspect elements
2. **Use Browser DevTools**: Check exact colors, spacing, fonts
3. **Pixel Perfect**: Match every detail exactly
4. **Test Interactions**: Ensure all animations and transitions match
5. **Responsive Testing**: Test on multiple screen sizes
6. **Performance**: Smooth 60fps animations
7. **Accessibility**: Test with screen readers and keyboard navigation

## Reference
- Visit https://chat.openai.com and study the interface
- Use browser developer tools to inspect:
  - Computed styles
  - Color values
  - Font families and sizes
  - Spacing and layout
  - Animations and transitions
  - Interaction behaviors

---

**CRITICAL**: This UI must be pixel-perfect match to ChatGPT. Any deviation should be intentional and documented.







