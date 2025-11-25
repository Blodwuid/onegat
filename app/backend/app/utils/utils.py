import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv  # Cargar variables de entorno

load_dotenv()
print("✅ Variables de entorno cargadas")

def enviar_correo(destinatario: str, asunto: str, mensaje: str):
    """Envía un correo electrónico utilizando un servidor SMTP en entorno local."""
    SMTP_SERVER = os.getenv("SMTP_SERVER")
    SMTP_PORT = int(os.getenv("SMTP_PORT"))
    REMITENTE = os.getenv("EMAIL_USER")
    PASSWORD = os.getenv("EMAIL_PASSWORD")

    print(f"📨 Intentando enviar correo a: {destinatario}")
    print(f"📧 Servidor SMTP: {SMTP_SERVER}:{SMTP_PORT}")

    try:
        msg = MIMEMultipart()
        msg['From'] = REMITENTE
        msg['To'] = destinatario
        msg['Subject'] = asunto
        msg.attach(MIMEText(mensaje, 'plain'))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10)
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(REMITENTE, PASSWORD)
        server.sendmail(REMITENTE, destinatario, msg.as_string())
        server.quit()

        print(f"✅ Correo enviado a {destinatario} con éxito.")
    
    except Exception as e:
        print(f"❌ Error al enviar el correo: {e}")
