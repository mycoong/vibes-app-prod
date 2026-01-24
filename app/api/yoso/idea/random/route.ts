import { NextResponse } from "next/server";

const DATA: Record<string, string[]> = {
  ERA_KOLONIAL: [
    "Penyergapan Tentara Belanda di Hutan Garut 1947",
    "Malam Gelap Penangkapan Pejuang Bandung",
    "Pelarian Rahasia Ulama Cirebon 1932",
    "Gudang Senjata Rahasia di Batavia 1926",
  ],
  SEJARAH_PERJUANGAN: [
    "Pertempuran Senyap Lereng Lawu 1948",
    "Kurir Remaja Menembus Garis Musuh",
    "Serangan Subuh di Desa Ambarawa",
    "Markas Gerilya di Gua Gunungkidul",
  ],
  LEGENDA_RAKYAT: [
    "Pasar Gaib Pantai Selatan",
    "Perjanjian Sunyi Penjaga Gunung Merapi",
    "Tangisan Putri Sungai Mahakam",
    "Rumah Hilang di Tengah Kabut Dieng",
  ],
  BUDAYA_NUSANTARA: [
    "Ritual Api Suku Baduy Dalam",
    "Festival Rahasia Topeng Cirebon",
    "Upacara Laut Tengah Malam di Lombok",
    "Tari Perang Tersembunyi Papua Pegunungan",
  ],
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const style = String(body?.style || "SEJARAH_PERJUANGAN");

    const pool = DATA[style] || DATA.SEJARAH_PERJUANGAN;
    const topic = pool[Math.floor(Math.random() * pool.length)];

    return NextResponse.json({ ok: true, topic });
  } catch {
    return NextResponse.json({ ok: false, error: "GAGAL_CARI_TOPIK" }, { status: 500 });
  }
}
