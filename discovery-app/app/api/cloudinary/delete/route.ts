import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { publicId, userId } = body;

    if (!publicId || typeof publicId !== 'string') {
      return NextResponse.json({ error: 'publicId is required' }, { status: 400 });
    }

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Security check: validate that publicId belongs to the user's folder
    const expectedPrefix = `users/${userId}/`;
    if (!publicId.startsWith(expectedPrefix)) {
      return NextResponse.json(
        { error: 'Unauthorized: publicId does not belong to user scope' },
        { status: 403 }
      );
    }

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result !== 'ok' && result.result !== 'not found') {
      return NextResponse.json(
        { error: `Cloudinary asset deletion failed with result: ${result.result}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('Error in /api/cloudinary/delete route:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete asset from Cloudinary' },
      { status: 500 }
    );
  }
}
