// src/data.js

export const anuarioData = [
  {
    tipoLayout: "full",
    elementos: [
      { 
        tipo: "imagem", 
        url: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=800&auto=format&fit=crop", 
        legenda: "Nossa jornada começa aqui" 
      }
    ]
  },
  {
    tipoLayout: "grid",
    elementos: [
      { tipo: "titulo", texto: "Nossa Turma", estilo: "dark" },
      { tipo: "texto", texto: "Este foi um ano inesquecível cheio de desafios, aprendizados e muitas memórias boas que guardaremos para sempre." },
      { 
        tipo: "imagem", 
        url: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=800&auto=format&fit=crop", 
        legenda: "A galera toda reunida no pátio" 
      }
    ]
  },
  {
    tipoLayout: "grid",
    elementos: [
      { tipo: "titulo", texto: "Momentos Especiais", estilo: "light" },
      { 
        tipo: "imagem", 
        url: "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?q=80&w=800&auto=format&fit=crop", 
        legenda: "Apresentação de fim de semestre" 
      },
      { tipo: "texto", texto: "Aquele frio na barriga antes da apresentação final valeu a pena!" }
    ]
  }
];