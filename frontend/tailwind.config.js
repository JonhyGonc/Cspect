/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Paleta aprovada (documentação v4, seção 9)
        fundo: "#14161A",
        painel: "#1E2227",
        destaque: "#F5A623",
        time_t: "#E07B39",
        time_ct: "#4A90D9",
        texto: "#E8EAED",
      },
    },
  },
  plugins: [],
};
