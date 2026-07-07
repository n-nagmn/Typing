const WORD_DATABASE = {
  easy: [
    { japanese: 'りんご', reading: 'りんご', romaji: 'ringo', points: 300 },
    { japanese: 'えんぴつ', reading: 'えんぴつ', romaji: 'enpitsu', points: 300 },
    { japanese: 'とけい', reading: 'とけい', romaji: 'tokei', points: 300 },
    { japanese: 'つくえ', reading: 'つくえ', romaji: 'tsukue', points: 300 },
    { japanese: 'いす', reading: 'いす', romaji: 'isu', points: 300 },
    { japanese: 'かさ', reading: 'かさ', romaji: 'kasa', points: 300 },
    { japanese: 'ほん', reading: 'ほん', romaji: 'hon', points: 300 },
    { japanese: 'パソコン', reading: 'ぱそこん', romaji: 'pasokon', points: 500 },
    { japanese: 'スマホ', reading: 'すまほ', romaji: 'sumaho', points: 500 },
    { japanese: 'かばん', reading: 'かばん', romaji: 'kaban', points: 300 },
    { japanese: 'めがね', reading: 'めがね', romaji: 'megane', points: 300 },
    { japanese: 'くるま', reading: 'くるま', romaji: 'kuruma', points: 300 },
    { japanese: 'でんしゃ', reading: 'でんしゃ', romaji: 'densha', points: 500 },
    { japanese: 'ひこうき', reading: 'ひこうき', romaji: 'hikouki', points: 500 },
    { japanese: 'うみ', reading: 'うみ', romaji: 'umi', points: 300 },
    { japanese: 'たいよう', reading: 'たいよう', romaji: 'taiyou', points: 500 },
    { japanese: 'じてんしゃ', reading: 'じてんしゃ', romaji: 'jitensha', points: 500 },
    { japanese: 'けしゴム', reading: 'けしごむ', romaji: 'keshigomu', points: 500 },
    { japanese: 'あいさつ', reading: 'あいさつ', romaji: 'aisatsu', points: 300 },
    { japanese: 'はさみ', reading: 'はさみ', romaji: 'hasami', points: 300 }
  ],
  normal: [
    { japanese: 'おはようございます', reading: 'おはようございます', romaji: 'ohayougozaimasu', points: 800 },
    { japanese: 'ありがとうございます', reading: 'ありがとうございます', romaji: 'arigatougozaimasu', points: 1000 },
    { japanese: 'お疲れ様でした', reading: 'おつかれさまでした', romaji: 'otsukaresamadeshita', points: 800 },
    { japanese: 'ごめんなさい', reading: 'ごめんなさい', romaji: 'gomennasai', points: 500 },
    { japanese: 'おやすみなさい', reading: 'おやすみなさい', romaji: 'oyasuminasai', points: 800 },
    { japanese: 'いってきます', reading: 'いってきます', romaji: 'ittekimasu', points: 500 },
    { japanese: 'おかえりなさい', reading: 'おかえりなさい', romaji: 'okaerinasai', points: 800 },
    { japanese: 'いただきます', reading: 'いただきます', romaji: 'itadakimasu', points: 500 },
    { japanese: 'ごちそうさま', reading: 'ごちそうさま', romaji: 'gochisousama', points: 800 },
    { japanese: 'はじめまして', reading: 'はじめまして', romaji: 'hajimemashite', points: 500 },
    { japanese: 'さようなら', reading: 'さようなら', romaji: 'sayounara', points: 500 },
    { japanese: '気をつけてね', reading: 'きをつけてね', romaji: 'kiwotsuketene', points: 500 },
    { japanese: 'お大事に', reading: 'おだいじに', romaji: 'odaijini', points: 500 },
    { japanese: '天気予報を見る', reading: 'てんきよほうをみる', romaji: 'tenkiyohouwomiru', points: 800 },
    { japanese: 'コンビニに行く', reading: 'こんびににいく', romaji: 'konbininiiku', points: 800 },
    { japanese: '明日は雨が降る', reading: 'あしたはあめがふる', romaji: 'ashitahaamegafuru', points: 800 },
    { japanese: 'テレビを見る', reading: 'てれびをみる', romaji: 'terebiwomiru', points: 500 },
    { japanese: '部屋の掃除をする', reading: 'へやのそうじをする', romaji: 'heyanosoujiwosuru', points: 800 }
  ],
  hard: [
    { japanese: '本日は晴天なり', reading: 'ほんじつはせいてんなり', romaji: 'honjitsuhaseitennari', points: 1000 },
    { japanese: '一期一会の出会い', reading: 'いちごいちえのであい', romaji: 'ichigoichienodeai', points: 1000 },
    { japanese: '石の上にも三年', reading: 'いしのうえにもさんねん', romaji: 'ishinouenimosannen', points: 1000 },
    { japanese: '七転び八起きの精神', reading: 'ななころびやおきのせいしん', romaji: 'nanakorobiyaokinoseishin', points: 1500 },
    { japanese: '早起きは三文の徳', reading: 'はやおきはさんもんのとく', romaji: 'hayaokihasanmonnotoku', points: 1000 },
    { japanese: '笑う門には福来たる', reading: 'わらうかどにはふくきたる', romaji: 'waraukadonihafukukitaru', points: 1000 },
    { japanese: '継続は力なり', reading: 'けいぞくはちからなり', romaji: 'keizokuhachikaranari', points: 1000 },
    { japanese: '思い立ったが吉日', reading: 'おもいたったがきちじつ', romaji: 'omoitattagakichijitsu', points: 1000 },
    { japanese: '急がば回れということわざ', reading: 'いそがばまわれということわざ', romaji: 'isogabamawaretoiukotowaza', points: 1500 },
    { japanese: '時は金なりを胸に刻む', reading: 'ときはかねなりをむねにきざむ', romaji: 'tokihakanenariwomunenikizamu', points: 1500 },
    { japanese: '初心忘るべからず', reading: 'しょしんわするべからず', romaji: 'shoshinwasurubekarazu', points: 1000 },
    { japanese: '塵も積もれば山となる', reading: 'ちりもつもればやまとなる', romaji: 'chirimotsumorebayamatonaru', points: 1500 },
    { japanese: '二度あることは三度ある', reading: 'にどあることはさんどある', romaji: 'nidoarukotohasandoaru', points: 1500 },
    { japanese: '百聞は一見にしかず', reading: 'ひゃくぶんはいっけんにしかず', romaji: 'hyakubunhaikkennishikazu', points: 1500 },
    { japanese: '失敗は成功のもとである', reading: 'しっぱいわせいこうのもとである', romaji: 'shippaiwaseikounomotodearu', points: 1500 },
    { japanese: '雨降って地固まる', reading: 'あめふってじかたまる', romaji: 'amefuttejikatamaru', points: 1000 }
  ]
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WORD_DATABASE;
} else {
  window.WORD_DATABASE = WORD_DATABASE;
}