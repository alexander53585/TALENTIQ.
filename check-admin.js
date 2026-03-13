import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Faltan llaves en el .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkConfig() {
  console.log("🚀 Intentando verificar permisos de administración...");
  
  // Nota: supabase-js no tiene un método oficial para cambiar el 'Site URL',
  // pero podemos intentar leer la salud del sistema o realizar una acción de admin.
  try {
    const { data: users, error } = await supabase.auth.admin.listUsers();
    if (error) throw error;
    console.log("✅ Conexión con Service Role exitosa. Puedo ver usuarios.");
    console.log(`ℹ️ Hay ${users.users.length} usuarios registrados.`);
    
    console.log("\n⚠️ AVISO: La configuración de 'Site URL' de Supabase SOLO se puede cambiar");
    console.log("vía Dashboard o Management API (requiere login vía CLI).");
    console.log("El cambio que hice en el código de React forzará la redirección,");
    console.log("PERO debes asegurarte de que 'https://app.kulturh.com' esté en");
    console.log("Authentication > URL Configuration > Redirect URLs en el panel de Supabase.");
    
  } catch (err) {
    console.error("❌ Error de permisos:", err.message);
  }
}

checkConfig();
