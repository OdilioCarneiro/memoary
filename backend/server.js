import express from 'express';
// 👇 Importamos o ObjectId do jeito certo e moderno aqui!
import { MongoClient, ObjectId } from 'mongodb';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import cors from 'cors'; 
import { Buffer } from 'buffer';
import process from 'process';

// INICIALIZA O DOTENV (Lê o arquivo .env se você estiver rodando no seu computador)
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors()); 
app.use(express.json());

// ==========================================
// 1. CONFIGURAÇÃO DO CLOUDINARY USANDO .ENV
// ==========================================
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ==========================================
// 2. STRING DO MONGODB USANDO .ENV
// ==========================================
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
let db;
      
async function conectarBanco() {
  try {
    await client.connect();
    db = client.db('anuarioDaTurma'); 
    console.log('✅ Conectado ao MongoDB nativo!');
  } catch (error) {
    console.error('❌ Erro ao conectar ao MongoDB:', error);
  }
}
conectarBanco();

// Rota POST para Upload e Criação de Página
app.post('/api/anuario', upload.single('image'), async (req, res) => {
  try {
    const { legenda } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Nenhuma imagem foi enviada.' });
    }

    // Converte a imagem para Buffer base64
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    let dataURI = "data:" + req.file.mimetype + ";base64," + b64;

    // Upload para o Cloudinary
    const cldRes = await cloudinary.uploader.upload(dataURI, {
      folder: "anuario_disciplina"
    });

    // Estrutura o objeto que vai para o MongoDB
    const novaPagina = {
      tipoLayout: 'grid',
      elementos: [
        {
          tipo: 'imagem',
          url: cldRes.secure_url,
          legenda: legenda || ''
        }
      ],
      criadoEm: new Date()
    };

    // Salva no banco de dados
    const colecao = db.collection('paginas');
    const resultado = await colecao.insertOne(novaPagina);

    res.status(201).json({ 
      success: true, 
      data: { ...novaPagina, _id: resultado.insertedId } 
    });

  } catch (error) {
    console.error('Erro na rota de upload:', error);
    res.status(500).json({ success: false, message: 'Erro ao processar o envio.' });
  }
});

app.post('/api/login', (req, res) => {
  const { usuario, senha } = req.body;

  // Aqui nós definimos o seu usuário e senha!
  const USUARIO_CORRETO = 'admin';
  const SENHA_CORRETA = 'admin123';

  if (usuario === USUARIO_CORRETO && senha === SENHA_CORRETA) {
    // Se acertar, devolvemos um "token" falso para o front-end liberar a página
    res.json({ success: true, token: 'token-super-secreto-do-memoary' });
  } else {
    // Se errar, devolvemos erro 401 (Não autorizado)
    res.status(401).json({ success: false, message: 'Usuário ou senha incorretos.' });
  }
});

app.get('/api/anuario', async (req, res) => {
  try {
    const colecao = db.collection('paginas');
    // Puxa todas as fotos do banco, ordenando pela data de criação
    const paginas = await colecao.find({}).sort({ criadoEm: 1 }).toArray();
    
    res.json({ success: true, data: paginas });
  } catch (error) {
    console.error('Erro ao buscar dados do anuário:', error);
    res.status(500).json({ success: false, message: 'Erro interno ao buscar as páginas.' });
  }
});

// ROTA PARA CRIAR UMA PÁGINA EM BRANCO
app.post('/api/anuario/nova-pagina', async (req, res) => {
  try {
    const novaPagina = {
      tipoLayout: 'grid',
      elementos: [], // Começa sem nenhum elemento dentro (Modo Canva)
      criadoEm: new Date()
    };

    const colecao = db.collection('paginas');
    const resultado = await colecao.insertOne(novaPagina);

    res.status(201).json({ 
      success: true, 
      data: { ...novaPagina, _id: resultado.insertedId } 
    });
  } catch (error) {
    console.error('Erro ao criar nova página:', error);
    res.status(500).json({ success: false, message: 'Erro ao criar página.' });
  }
});

// ROTA PARA SALVAR/ATUALIZAR UMA PÁGINA
app.put('/api/anuario/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { elementos } = req.body; // Pega as fotos e coordenadas que o Admin enviou

    const colecao = db.collection('paginas');
    
    // Atualiza apenas os elementos da página específica
    await colecao.updateOne(
      { _id: new ObjectId(id) },
      { $set: { elementos: elementos } }
    );

    res.json({ success: true, message: 'Página atualizada com sucesso!' });
  } catch (error) {
    console.error('Erro ao salvar página:', error);
    res.status(500).json({ success: false, message: 'Erro ao salvar página.' });
  }
});

// Configuração da porta dinâmica do Render ou local
const PORT = process.env.PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});