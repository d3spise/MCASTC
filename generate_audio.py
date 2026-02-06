import os
import json
import markdown
from bs4 import BeautifulSoup
from gtts import gTTS

# Konfiguracja
AUDIO_DIR = "audio"
POSTS_DIR = "posts"

def clean_text(md_content):
    """
    Konwertuje markdown na czysty tekst do odczytu.
    """
    # 1. Konwersja MD -> HTML
    html = markdown.markdown(md_content)
    # 2. Wyciągnięcie tekstu z HTML (usuwa tagi)
    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text()
    return text

def process_lang(lang):
    json_path = os.path.join(POSTS_DIR, lang, "index.json")
    if not os.path.exists(json_path):
        print(f"Nie znaleziono pliku indeksu: {json_path}")
        return
    
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            posts = json.load(f)
    except Exception as e:
        print(f"Błąd odczytu JSON {json_path}: {e}")
        return
    
    # Upewnij się, że katalog wyjściowy istnieje
    output_dir = os.path.join(AUDIO_DIR, lang)
    os.makedirs(output_dir, exist_ok=True)
    
    lang_code = 'pl' if lang == 'pl' else 'en'
    
    for post in posts:
        post_id = post.get('id')
        title = post.get('title', '')
        
        if not post_id:
            continue

        md_path = os.path.join(POSTS_DIR, lang, f"{post_id}.md")
        audio_path = os.path.join(output_dir, f"{post_id}.mp3")
        
        # Sprawdź czy plik wykonać (pomiń jeśli istnieje)
        # Można dodać flagę --force w przyszłości
        if os.path.exists(audio_path):
            # Opcjonalnie: sprawdź czy MD jest nowszy niż MP3
            md_mtime = os.path.getmtime(md_path) if os.path.exists(md_path) else 0
            mp3_mtime = os.path.getmtime(audio_path)
            
            if md_mtime < mp3_mtime:
                # print(f"Pomijam (aktualny): {post_id} [{lang}]")
                continue
            else:
                print(f"Aktualizacja (zmieniono treść): {post_id} [{lang}]")
        
        if not os.path.exists(md_path):
            print(f"⚠️ Brak pliku treści: {md_path}")
            continue
            
        print(f"🎙️ Generowanie audio dla: {post_id} [{lang}]...")
        
        try:
            with open(md_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Prosta heurystyka usuwania powtórzonego tytułu na początku
            # Jeśli treść zaczyna się od "# Tytuł", usuwamy to, bo tytuł dodamy sami na początku
            header_title = f"# {title}"
            if content.strip().startswith(header_title):
                content = content.replace(header_title, "", 1)
            
            # Wyczyszczenie tekstu
            clean_body = clean_text(content)
            
            # Pełny tekst do przeczytania
            full_text = f"{title}. \n\n {clean_body}"
            
            if not full_text.strip():
                print("Pusty tekst, pomijam.")
                continue

            # Generowanie
            tts = gTTS(text=full_text, lang=lang_code)
            tts.save(audio_path)
            print(f"✅ Zapisano: {audio_path}")
            
        except Exception as e:
            print(f"❌ Błąd przy {post_id}: {e}")

if __name__ == "__main__":
    print("--- Start generowania audio ---")
    process_lang('pl')
    process_lang('en')
    print("--- Zakończono ---")
