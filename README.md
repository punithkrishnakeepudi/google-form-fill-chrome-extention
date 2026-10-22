# Google Form Autofill — Chrome Extension

A lightweight, intelligent Chrome Extension (Manifest V3) that automatically fills Google Forms using your saved profile, learns new answers on the fly, and intelligently adapts to different question wordings across multi-page forms.

---

## 🌟 Key Features

- **⚡ Instant One-Click Autofill**  
  Quickly fills Google Forms with your personal and academic/professional information.
- **🎯 Broad Input Type Support**  
  Works seamlessly with:
  - Text fields, email, phone/tel, number, URL, date, time, and textareas.
  - Single-choice radio buttons (`[role="radio"]`).
  - Multiple-choice checkboxes (`[role="checkbox"]`, supporting multiple selected values).
  - Dropdown select menus (`[role="listbox"]` / `[role="option"]`).
  - Choice grids and multi-row groups (`[role="radiogroup"]` / `[role="group"]`).
- **🧠 Smart Question Matching & Fuzzy Aliasing**  
  - Automatically maps common phrasing variations to standard fields (e.g. *"Student Name"*, *"Full Name"*, *"Your Name"* $\rightarrow$ **name**).
  - Normalizes common abbreviations (e.g., `no`, `nos`, `num` $\rightarrow$ `number`; `mob` $\rightarrow$ `mobile`; `yr` $\rightarrow$ `year`; `dept` $\rightarrow$ `department`).
  - Eliminates common filler words (`of`, `the`, `a`, `your`, `please`, `enter`, etc.) to match questions accurately.
  - Learned key coverage: An answer saved for *"Roll Number"* will correctly match *"Your Roll No."* or *"College Roll Number"*, while preventing false positives on broader questions like *"Interested in campus placement?"*.
- **🛡️ False-Positive Protection**  
  A built-in regex guard detects third-party or alternative fields (such as `father`, `mother`, `guardian`, `emergency`, `alternate email`, `reference`, `team member`, etc.) and prevents mistakenly filling your own details unless explicitly mapped.
- **🎓 Interactive Learning ("Offer to Save" Toasts)**  
  When you manually enter or select an answer that hasn't been saved yet, an unobtrusive toast notification asks if you want to remember it. One click adds it to your profile for future forms.
- **📄 Multi-Page Form Detection**  
  Uses a `MutationObserver` to watch for page transitions in multi-step Google Forms, ensuring subsequent pages are automatically autofilled as you navigate.
- **🎨 Modern, Adaptive Popup UI**  
  - Automatically adapts to system light and dark themes.
  - **"Needs an answer"** section immediately displays any questions from the current form that need your input.
  - **"My details"** expandable section to review and edit saved answers.
  - **"+ Add a question"** tool to manually define custom fields.
  - **"Copy all"** JSON export button to easily backup your profile.
- **🔒 100% Private & Local**  
  All profile data is stored locally in your browser using `chrome.storage.local`. No analytics, no tracking, and no external servers.

---

## 🏗️ Project Architecture

```
form-fill-ai-extention/
├── manifest.json   # Chrome Extension Manifest V3 configuration
├── content.js      # Content script injected into Google Forms (DOM handling & matching)
├── popup.html      # Extension popup UI (Light/Dark mode styling)
├── popup.js        # Popup controller (Profile state, storage & tab messaging)
├── test.js         # Automated unit test suite (Node.js test runner)
└── README.md       # Project documentation
```

### File Breakdown

- **`manifest.json`**  
  Defines Manifest V3 metadata, permissions (`storage`, `scripting`, `activeTab`), host permissions (`https://docs.google.com/forms/*`), popup declaration, and content script registration.
- **`content.js`**  
  The core engine executing within Google Forms pages:
  - **`ALIASES` & `SOMEONE_ELSE`**: Dictionaries defining standard profile aliases and excluded relationships.
  - **`findKey(title, profile)` & `learnedKey(title, profile)`**: Logic that parses form question headings, cleans filler words, resolves aliases, and finds the closest matching profile entry.
  - **`units(q)` & `rowsOf(q)`**: Extracts answerable units, handling both standard questions and individual rows inside grid questions.
  - **`fill(el, value)`**: Synthesizes DOM interactions. Utilizes native property setters (`Object.getOwnPropertyDescriptor(Object.getPrototypeOf(box), 'value').set`) and dispatches synthetic `input` and `change` events so Google Forms' internal reactive state updates correctly.
  - **`offerSave(target)` & `toast(...)`**: Intercepts user inputs/clicks on new questions and displays a prompt offering to remember the answer.
  - **`listen()` & `MutationObserver`**: Detects form page changes and dynamic DOM updates.
- **`popup.html` & `popup.js`**  
  - Communicates with `content.js` via `chrome.tabs.sendMessage(tab.id, 'fill')`.
  - Automatically injects `content.js` via `chrome.scripting.executeScript` if the tab was loaded before extension initialization.
  - Renders missing fields, saves profile changes to `chrome.storage.local`, and allows copying the profile as JSON.
- **`test.js`**  
  Unit tests validating fuzzy matching, abbreviation expansions, relationship exclusions, and learned-key boundary checks.

---

## 🚀 Installation Guide

### Prerequisites
- Google Chrome, Brave, Microsoft Edge, or any Chromium-based web browser.
- (Optional for development/tests) [Node.js](https://nodejs.org/) (v16+).

### Step-by-Step Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/punithkrishnakeepudi/google-form-fill-chrome-extention.git
   cd google-form-fill-chrome-extention
   ```

2. **Load into Chrome:**
   1. Open Chrome and navigate to `chrome://extensions/`.
   2. In the top-right corner, enable **Developer mode**.
   3. Click the **Load unpacked** button in the top-left corner.
   4. Select the `google-form-fill-chrome-extention` folder.
   5. The extension **"Google Form Autofill"** will now appear in your extensions list.

---

## 📖 How to Use

1. **Set Up Your Profile**:
   - Click the extension icon in your Chrome toolbar.
   - Enter your default details: **Name**, **Phone**, **Email**, **College**, **Class**.
   - Click **Save & fill**.
2. **Open a Google Form**:
   - Navigate to any Google Form (`https://docs.google.com/forms/*`).
   - The extension automatically checks the form. Click the extension icon to view filled questions.
   - Any questions missing from your profile appear under the **"Needs an answer"** section. Type your answers there and click **Save & fill** to save and apply them immediately.
3. **Multi-Select Checkboxes**:
   - If a question accepts multiple answers, enter them separated by semicolons (`;`), for example:  
     `JavaScript; Python; TypeScript`
4. **Learn As You Go**:
   - Fill out an unmapped field manually in Google Forms.
   - A toast notification will appear in the bottom-right corner:  
     `"Save answer for <Question>? → <Your Answer>"`
   - Click **Save** to permanently add it to your profile.
5. **Backup Your Profile**:
   - Click the **Copy all** button in the popup footer to copy your entire profile as formatted JSON.

---

## 🧪 Running Unit Tests

The matching algorithms in `content.js` are decoupled and exported for testing.

Run the test suite with Node.js:
```bash
node test.js
```

If all tests pass, the output will display:
```
ok
```

---

## 🔒 Privacy & Permissions

- **`storage`**: Used exclusively to store your profile data in `chrome.storage.local`.
- **`activeTab` & `scripting`**: Used to communicate with the active Google Form tab and ensure content scripts are injected.
- **`host_permissions` (`https://docs.google.com/forms/*`)**: Scoped strictly to Google Forms URLs. No other websites are accessed.
- **Zero Network Calls**: The extension makes no external network requests. All data stays within your local browser storage.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
