# Records .github/assets/demo.gif, the terminal demo at the top of the README.
#
# Run from the repo root:  vhs .github/assets/demo.tape
# Needs vhs (https://github.com/charmbracelet/vhs), plus ttyd and ffmpeg.
# It packs this checkout and installs it into a throwaway HOME, so it never
# touches your real ~/.claude-second-brain or skills folders.

Output .github/assets/demo.gif

Set Shell "bash"
Set FontSize 15
Set Width 1000
Set Height 640
Set Padding 24
Set Theme "Catppuccin Mocha"
Set TypingSpeed 60ms
Set WindowBar Colorful
Set CursorBlink false

Hide
Type `export DEMO=$(mktemp -d) && npm pack --silent --pack-destination "$DEMO" >/dev/null && export HOME="$DEMO" NPM_CONFIG_PREFIX="$DEMO/.npm-global" && export PATH="$NPM_CONFIG_PREFIX/bin:$PATH" && npm i -g --silent "$DEMO"/claude-second-brain-*.tgz >/dev/null 2>&1 && git config --global user.name demo && git config --global user.email demo@example.com && git config --global init.defaultBranch main && cd "$HOME" && export PS1='$ ' && clear`
Enter
Sleep 25s
Show

Type "npx claude-second-brain"
Sleep 500ms
Enter
Sleep 2s

# Name of the brain? (accept the default)
Type "my-brain"
Sleep 700ms
Enter
Sleep 1.2s

# Where to host the Git remote? -> Skip
Down
Sleep 400ms
Down
Sleep 700ms
Enter
Sleep 1.2s

# Register qmd collections? -> Yes
Enter
Sleep 1.2s

# Install skills for which agents? (keep the preselection)
Sleep 800ms
Enter

# Install, qmd setup, skills, git init
Sleep 15s

# Hold on the Next steps box
Sleep 4s
