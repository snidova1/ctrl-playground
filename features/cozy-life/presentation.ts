import {CROPS,ITEMS,RECIPES,type CropId,type GardenBed,type Inventory,type ItemId,type RecipeId} from '@/domain/cozy-life';

export const LIFE_TABS = ['garden','fishing','kitchen','craft','bag','community','barter'] as const;
export type LifeTab = typeof LIFE_TABS[number];
export function isLifeTab(value:unknown):value is LifeTab{return typeof value==='string'&&(LIFE_TABS as readonly string[]).includes(value);}
export const TAB_LABELS:Record<LifeTab,{icon:string;label:string}>={garden:{icon:'🌱',label:'Kebun'},fishing:{icon:'🎣',label:'Memancing'},kitchen:{icon:'🍲',label:'Dapur'},craft:{icon:'🪴',label:'Kriya'},bag:{icon:'🧺',label:'Tas'},community:{icon:'🌿',label:'Bersama'},barter:{icon:'↔',label:'Barter'}};
export const ITEM_ICONS:Record<ItemId,string>={'turnip-seed':'🌰','tomato-seed':'🌰','herb-seed':'🌰',turnip:'🥬',tomato:'🍅',herb:'🌿',perch:'🐟',carp:'🐠',driftwood:'🪵',clay:'🪨','garden-soup':'🍲','grilled-fish':'🍽️','flower-pot':'🪴','wooden-bench':'🪑'};
export const ITEM_LABELS:Record<ItemId,string>={'turnip-seed':'Benih lobak','tomato-seed':'Benih tomat','herb-seed':'Benih herba',turnip:'Lobak',tomato:'Tomat',herb:'Herba',perch:'Ikan kolam',carp:'Ikan mas',driftwood:'Kayu hanyut',clay:'Tanah liat','garden-soup':'Sup kebun','grilled-fish':'Ikan berherba','flower-pot':'Pot bunga','wooden-bench':'Bangku kayu'};
export const CROP_LABELS:Record<CropId,string>={turnip:'Lobak',tomato:'Tomat',herb:'Herba'};
export function itemName(id:ItemId){return ITEM_LABELS[id]??ITEMS[id].name;}
export function countdown(ms:number){const seconds=Math.max(0,Math.ceil(ms/1000));return seconds>=60?`${Math.floor(seconds/60)}m ${seconds%60}d`:`${seconds} detik`;}
export function bedProgress(bed:GardenBed,now:number){if(!bed.crop||bed.wateredAt===null||bed.readyAt===null)return 0;return Math.max(0,Math.min(1,(now-bed.wateredAt)/CROPS[bed.crop].growMs));}
export function canMake(inventory:Inventory,id:RecipeId){return Object.entries(RECIPES[id].ingredients).every(([item,n])=>(inventory[item as ItemId]??0)>=n);}
export function inventoryEntries(inventory:Inventory){return (Object.entries(inventory) as [ItemId,number][]).filter(([id,n])=>id in ITEMS&&n>0);}
export const LIFE_ERRORS:Record<string,string>={INSUFFICIENT_ITEMS:'Bahan di tas belum cukup. Coba panen atau memancing dulu.',CROP_NOT_READY:'Tanaman masih tumbuh. Sebentar lagi, ya.',FISH_TOO_EARLY:'Belum ada gigitan. Tunggu pelampung memberi tanda.',FISHING_COOLDOWN:'Tunggu sebentar sebelum melempar lagi.',BED_OCCUPIED:'Petak ini sudah ditanami. Segarkan catatan untuk melihatnya.',ALREADY_WATERED:'Tanaman ini sudah disiram.',REVISION_CONFLICT:'Catatan berubah di sesi lain. Data terbaru dimuat; periksa lalu coba lagi.',LIFE_CONFLICT:'Catatan berubah di sesi lain. Segarkan sebelum mencoba lagi.',UNAUTHORIZED:'Sesi akun berakhir. Masuk kembali; tidak ada perubahan yang dialihkan ke browser.',LIFE_EDIT_CONFLICT:'Catatan berubah di sesi lain. Data terbaru dimuat; periksa lalu coba lagi.',RATE_LIMITED:'Terlalu banyak aktivitas sekaligus. Tunggu sebentar, lalu segarkan catatan.',SAME_TRADE_ITEM:'Pilih dua jenis barang yang berbeda.',OFFER_LIMIT:'Tawaran terbukamu sudah penuh. Batalkan satu sebelum membuat yang baru.',OFFER_NOT_FOUND:'Tawaran ini sudah tidak tersedia. Segarkan papan barter.',STORAGE_UNAVAILABLE:'Browser tidak dapat menyimpan catatan. Izinkan penyimpanan lalu coba lagi.',STORAGE_INVALID:'Catatan browser tidak terbaca. Data lama tidak ditimpa. Periksa penyimpanan browser.',NETWORK_ERROR:'Koneksi terputus. Perubahan belum dikonfirmasi; segarkan sebelum mencoba lagi.',OFFER_UNAVAILABLE:'Tawaran ini sudah tidak tersedia. Segarkan papan barter.',SELF_TRADE:'Ini tawaranmu sendiri; kamu bisa membatalkannya.'};
export function lifeErrorMessage(error:unknown){const code=error&&typeof error==='object'&&'code'in error?String(error.code):error instanceof Error?error.message:'';return LIFE_ERRORS[code]??(error instanceof Error?error.message:'Catatan belum dapat disimpan. Coba lagi.');}
Object.assign(LIFE_ERRORS,{
 HOME_REQUIRED:'Penempatan membutuhkan Habitat milikmu yang sudah ada. Tidak ada rumah yang dibuat otomatis.',
 PLACEMENT_BLOCKED:'Tempat ini terhalang rumah, perabot, atau kebun. Coba tempatkan lagi setelah merapikan lahan.',
 DECORATION_LIMIT:'Lahan sudah berisi 20 dekorasi. Simpan satu kembali ke tas sebelum menambah.',
 DECORATION_NOT_FOUND:'Dekorasi ini sudah tidak ada. Segarkan catatan sebelum mencoba lagi.',
 SERVING_LIMIT:'Masakan titipanmu sudah penuh. Tunggu satu porsi disantap sebelum menyajikan lagi.',
 SERVING_NOT_FOUND:'Porsi ini sudah tidak tersedia. Segarkan meja bersama.',
 SERVING_UNAVAILABLE:'Porsi ini sudah disantap pemain lain. Catatan terbaru dimuat; pilih porsi lainnya.',
});
