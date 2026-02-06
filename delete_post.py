import json
import os
import re

# Konfiguracja - te same ścieżki co w new_post.py
POSTS_DIR_PL = "posts/pl"
POSTS_DIR_EN = "posts/en"
AUDIO_DIR_PL = "audio/pl"
AUDIO_DIR_EN = "audio/en"
JSON_PATH_PL = "posts/pl/index.json"
JSON_PATH_EN = "posts/en/index.json"
SITEMAP_PATH = "sitemap.xml"

def load_json(path):
    if not os.path.exists(path):
        return []
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Błąd odczytu JSON {path}: {e}")
        return []

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

def remove_from_json(path, post_id):
    if not os.path.exists(path):
        print(f"⚠️  Nie znaleziono pliku JSON: {path}")
        return False

    data = load_json(path)
    original_count = len(data)
    new_data = [post for post in data if post.get('id') != post_id]
    
    if len(new_data) == original_count:
        print(f"ℹ️  Nie znaleziono ID '{post_id}' w {path}")
        return False
    
    save_json(path, new_data)
    print(f"✅ Usunięto wpis z {path}")
    return True

def remove_file(path):
    if os.path.exists(path):
        try:
            os.remove(path)
            print(f"✅ Usunięto plik: {path}")
        except Exception as e:
            print(f"❌ Błąd podczas usuwania pliku {path}: {e}")
    else:
        print(f"ℹ️  Plik nie istnieje (pominięto): {path}")

def remove_from_sitemap(post_id):
    if not os.path.exists(SITEMAP_PATH):
        print("⚠️  Nie znaleziono sitemap.xml")
        return

    with open(SITEMAP_PATH, 'r', encoding='utf-8') as f:
        content = f.read()

    # Poprawiony regex, który nie "zjada" innych bloków URL
    # <url>(?:(?!</url>).)*?id=....*?</url>
    # (?:(?!</url>).)* upewnia się, że nie przeskoczymy zamknięcia tagu </url> w poszukiwaniu ID
    pattern = r'<url>(?:(?!</url>).)*?article\.html\?id=' + re.escape(post_id) + r'.*?</url>'
    
    matches = re.findall(pattern, content, flags=re.DOTALL)
    
    if not matches:
        print(f"ℹ️  Nie znaleziono wpisów w sitemap.xml dla ID: {post_id}")
        return

    new_content = content
    for match in matches:
        new_content = new_content.replace(match, "")

    # Opcjonalne: usuń nadmiarowe puste linie (np. więcej niż 2 z rzędu)
    new_content = re.sub(r'\n\s*\n', '\n', new_content)

    with open(SITEMAP_PATH, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"✅ Usunięto {len(matches)} wpis(y) z sitemap.xml")

def main():
    print("\n--- NARZĘDZIE DO USUWANIA ARTYKUŁÓW ---")
    post_id = input("Podaj ID artykułu do usunięcia (np. nowosc-blog): ").strip()
    
    if not post_id:
        print("Anulowano (brak ID).")
        return

    print(f"\nZamierzasz usunąć artykuł o ID: {post_id}")
    print("Zostaną usunięte:")
    print(f"- Wpis w {JSON_PATH_PL}")
    print(f"- Wpis w {JSON_PATH_EN}")
    print(f"- Plik {POSTS_DIR_PL}/{post_id}.md")
    print(f"- Plik {POSTS_DIR_EN}/{post_id}.md")
    print(f"- Pliki audio MP3 ({AUDIO_DIR_PL}/..., {AUDIO_DIR_EN}/...)")
    print("- Wpisy w sitemap.xml")
    
    confirm = input("\nCzy na pewno chcesz kontynuować? (tak/nie): ").lower()
    if confirm not in ['tak', 'y', 'yes', 't']:
        print("Anulowano.")
        return

    print("\nProces usuwania...")

    # 1. Usuń z JSON
    remove_from_json(JSON_PATH_PL, post_id)
    remove_from_json(JSON_PATH_EN, post_id)

    # 2. Usuń pliki MD
    remove_file(os.path.join(POSTS_DIR_PL, f"{post_id}.md"))
    remove_file(os.path.join(POSTS_DIR_EN, f"{post_id}.md"))

    # 3. Usuń pliki Audio
    remove_file(os.path.join(AUDIO_DIR_PL, f"{post_id}.mp3"))
    remove_file(os.path.join(AUDIO_DIR_EN, f"{post_id}.mp3"))

    # 4. Usuń z Sitemap
    remove_from_sitemap(post_id)

    print("\n🗑️  Zakończono operację.")

if __name__ == "__main__":
    main()
