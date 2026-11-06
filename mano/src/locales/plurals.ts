/** Counted phrases, one entry per language with that language's own plural
 * categories (Intl.PluralRules): Spanish, English and French one/other (French
 * counts 0 as one), Arabic zero/one/two/few/many/other, Japanese other only.
 * `{n}` is the number; `{amount}` is filled by the screen (i18n.ts parts). */
type Forms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };
export type PluralKey = 'photos' | 'videos' | 'files' | 'pileTail' | 'laterWaiting' | 'pendingFree' | 'pendingFreeAtLeast' | 'similarGroups' | 'sentToDeleted' | 'selected' | 'createAndAdd';
type Table = Record<PluralKey, Forms>;

const es: Table = {
  photos: { one: '{n} foto', other: '{n} fotos' },
  videos: { one: '{n} vídeo', other: '{n} vídeos' },
  files: { one: '{n} archivo', other: '{n} archivos' },
  pileTail: { one: 'archivo en la pila con estos filtros', other: 'archivos en la pila con estos filtros' },
  laterWaiting: { one: '{n} para más tarde: te espera al final de la pila.', other: '{n} para más tarde: te esperan al final de la pila.' },
  pendingFree: { one: 'Si eliminas lo marcado liberas {amount}. Si no, se guarda para la próxima ronda.', other: 'Si eliminas las {n} marcadas liberas {amount}. Si no, se guardan para la próxima ronda.' },
  pendingFreeAtLeast: { one: 'Si eliminas lo marcado liberas al menos {amount}. Si no, se guarda para la próxima ronda.', other: 'Si eliminas las {n} marcadas liberas al menos {amount}. Si no, se guardan para la próxima ronda.' },
  similarGroups: { one: '{n} grupo\nde parecidas', other: '{n} grupos\nde parecidas' },
  sentToDeleted: { one: '{n} enviada a Eliminado recientemente', other: '{n} enviadas a Eliminado recientemente' },
  selected: { one: '{n} seleccionada', other: '{n} seleccionadas' },
  createAndAdd: { one: 'Crear y añadir {n} elemento', other: 'Crear y añadir {n} elementos' },
};
const en: Table = {
  photos: { one: '{n} photo', other: '{n} photos' },
  videos: { one: '{n} video', other: '{n} videos' },
  files: { one: '{n} file', other: '{n} files' },
  pileTail: { one: 'file in the pile with these filters', other: 'files in the pile with these filters' },
  laterWaiting: { one: '{n} for later: it’s waiting at the end of the pile.', other: '{n} for later: they’re waiting at the end of the pile.' },
  pendingFree: { one: 'Delete what you marked and you free up {amount}. If not, it stays for your next round.', other: 'Delete the {n} you marked and you free up {amount}. If not, they stay for your next round.' },
  pendingFreeAtLeast: { one: 'Delete what you marked and you free up at least {amount}. If not, it stays for your next round.', other: 'Delete the {n} you marked and you free up at least {amount}. If not, they stay for your next round.' },
  similarGroups: { one: '{n} group of\nsimilar photos', other: '{n} groups of\nsimilar photos' },
  sentToDeleted: { one: '{n} moved to Recently Deleted', other: '{n} moved to Recently Deleted' },
  selected: { one: '{n} selected', other: '{n} selected' },
  createAndAdd: { one: 'Create and add {n} item', other: 'Create and add {n} items' },
};
const fr: Table = {
  photos: { one: '{n} photo', other: '{n} photos' },
  videos: { one: '{n} vidéo', other: '{n} vidéos' },
  files: { one: '{n} fichier', other: '{n} fichiers' },
  pileTail: { one: 'fichier dans la pile avec ces filtres', other: 'fichiers dans la pile avec ces filtres' },
  laterWaiting: { one: '{n} pour plus tard : il t’attend en fin de pile.', other: '{n} pour plus tard : ils t’attendent en fin de pile.' },
  pendingFree: { one: 'Si tu supprimes ce que tu as marqué, tu libères {amount}. Sinon, ça reste pour la prochaine fois.', other: 'Si tu supprimes les {n} éléments marqués, tu libères {amount}. Sinon, ils restent pour la prochaine fois.' },
  pendingFreeAtLeast: { one: 'Si tu supprimes ce que tu as marqué, tu libères au moins {amount}. Sinon, ça reste pour la prochaine fois.', other: 'Si tu supprimes les {n} éléments marqués, tu libères au moins {amount}. Sinon, ils restent pour la prochaine fois.' },
  similarGroups: { one: '{n} groupe de\nphotos similaires', other: '{n} groupes de\nphotos similaires' },
  sentToDeleted: { one: '{n} envoyé dans Suppressions récentes', other: '{n} envoyés dans Suppressions récentes' },
  selected: { one: '{n} sélectionné', other: '{n} sélectionnés' },
  createAndAdd: { one: 'Créer et ajouter {n} élément', other: 'Créer et ajouter {n} éléments' },
};
const ar: Table = {
  photos: { zero: 'لا صور', one: 'صورة واحدة', two: 'صورتان', few: '{n} صور', many: '{n} صورة', other: '{n} صورة' },
  videos: { zero: 'لا فيديوهات', one: 'فيديو واحد', two: 'فيديوان', few: '{n} فيديوهات', many: '{n} فيديو', other: '{n} فيديو' },
  files: { zero: 'لا ملفات', one: 'ملف واحد', two: 'ملفان', few: '{n} ملفات', many: '{n} ملفًا', other: '{n} ملف' },
  pileTail: { zero: 'ملفات في الكومة بهذه الفلاتر', one: 'ملف في الكومة بهذه الفلاتر', two: 'ملفان في الكومة بهذه الفلاتر', few: 'ملفات في الكومة بهذه الفلاتر', many: 'ملفًا في الكومة بهذه الفلاتر', other: 'ملف في الكومة بهذه الفلاتر' },
  laterWaiting: { one: 'عنصر واحد لوقت لاحق: ينتظرك في آخر الكومة.', two: 'عنصران لوقت لاحق: ينتظرانك في آخر الكومة.', few: '{n} عناصر لوقت لاحق: تنتظرك في آخر الكومة.', many: '{n} عنصرًا لوقت لاحق: تنتظرك في آخر الكومة.', other: '{n} عنصر لوقت لاحق: تنتظرك في آخر الكومة.' },
  pendingFree: { one: 'إذا حذفت ما حدّدته فستوفّر {amount}. وإلا فسيبقى للجولة القادمة.', other: 'إذا حذفت العناصر المحدّدة ({n}) فستوفّر {amount}. وإلا فستبقى للجولة القادمة.' },
  pendingFreeAtLeast: { one: 'إذا حذفت ما حدّدته فستوفّر {amount} على الأقل. وإلا فسيبقى للجولة القادمة.', other: 'إذا حذفت العناصر المحدّدة ({n}) فستوفّر {amount} على الأقل. وإلا فستبقى للجولة القادمة.' },
  similarGroups: { one: 'مجموعة واحدة\nمن الصور المتشابهة', two: 'مجموعتان\nمن الصور المتشابهة', few: '{n} مجموعات\nمن الصور المتشابهة', many: '{n} مجموعة\nمن الصور المتشابهة', other: '{n} مجموعة\nمن الصور المتشابهة' },
  sentToDeleted: { one: 'نُقل عنصر واحد إلى المحذوفة مؤخرًا', two: 'نُقل عنصران إلى المحذوفة مؤخرًا', few: 'نُقلت {n} عناصر إلى المحذوفة مؤخرًا', many: 'نُقل {n} عنصرًا إلى المحذوفة مؤخرًا', other: 'نُقل {n} عنصر إلى المحذوفة مؤخرًا' },
  selected: { zero: 'لا شيء محدّد', one: 'عنصر واحد محدّد', two: 'عنصران محدّدان', few: '{n} عناصر محدّدة', many: '{n} عنصرًا محدّدًا', other: '{n} عنصر محدّد' },
  createAndAdd: { one: 'إنشاء وإضافة عنصر واحد', two: 'إنشاء وإضافة عنصرين', few: 'إنشاء وإضافة {n} عناصر', many: 'إنشاء وإضافة {n} عنصرًا', other: 'إنشاء وإضافة {n} عنصر' },
};
const ja: Table = {
  photos: { other: '{n}枚の写真' },
  videos: { other: '{n}本のビデオ' },
  files: { other: '{n}件' },
  pileTail: { other: '件がこの条件で山に残っています' },
  laterWaiting: { other: '「あとで」が{n}件：山の最後で待っています。' },
  pendingFree: { other: '印をつけた{n}件を削除すると{amount}空きます。削除しなければ次回に残ります。' },
  pendingFreeAtLeast: { other: '印をつけた{n}件を削除すると少なくとも{amount}空きます。削除しなければ次回に残ります。' },
  similarGroups: { other: '似た写真の\nグループが{n}件' },
  sentToDeleted: { other: '{n}件を「最近削除した項目」に移動しました' },
  selected: { other: '{n}件を選択中' },
  createAndAdd: { other: '作成して{n}件を追加' },
};
export const PLURALS = { es, en, fr, ar, ja };
