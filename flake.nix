{
  description = "Obsidian Food Tracker plugin development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            # Node.js and package manager
            nodejs_24
            pnpm_11

            # Development tools
            just
            typescript

            # Build tools
            esbuild

            # Optional tools
            git
          ];

          shellHook = ''
            echo "🚀 Obsidian Food Tracker development environment"
            echo "📦 Node.js $(node --version)"
            echo "📦 pnpm $(pnpm --version)"
            echo "⚡ TypeScript $(tsc --version)"
            echo ""
            echo "Available commands:"
            echo "  just clean   - Clean build artifacts"
            echo "  just build   - Full production build"
            echo "  just test    - Run tests"
            echo "  just lint    - Run linter"
            echo ""
            echo "Run 'just --list' for all available commands"
          '';
        };

        # Optional: Add formatter for nix files
        formatter = pkgs.nixpkgs-fmt;
      }
    );
}