/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./context/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                neon: {
                    lime: '#ccff00',
                    blue: '#00ffff',
                    dark: '#0a0a0a',
                    glass: 'rgba(255, 255, 255, 0.05)',
                }
            },
            fontFamily: {
                sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
                display: ['Impact', 'Arial Black', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
