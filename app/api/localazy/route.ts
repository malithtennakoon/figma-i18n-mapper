import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const token = process.env.LOCALAZY_API_TOKEN;
    const projectId = process.env.LOCALAZY_PROJECT_ID;
    const fileId = process.env.LOCALAZY_FILE_ID;

    if (!token || !projectId || !fileId) {
      return NextResponse.json(
        { error: 'Localazy credentials not configured in environment variables' },
        { status: 500 }
      );
    }

    // Fetch both English and Japanese files in parallel
    const [enResponse, jaResponse] = await Promise.all([
      fetch(
        `https://api.localazy.com/projects/${projectId}/files/${fileId}/download/en`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      ),
      fetch(
        `https://api.localazy.com/projects/${projectId}/files/${fileId}/download/ja`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      ),
    ]);

    if (!enResponse.ok) {
      throw new Error(`Failed to fetch English file: ${enResponse.statusText}`);
    }

    if (!jaResponse.ok) {
      throw new Error(`Failed to fetch Japanese file: ${jaResponse.statusText}`);
    }

    const enJson = await enResponse.json();
    const jaJson = await jaResponse.json();

    return NextResponse.json({
      success: true,
      data: {
        enJson,
        jaJson,
      },
    });
  } catch (error) {
    console.error('Error fetching from Localazy:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'An error occurred while fetching files from Localazy',
      },
      { status: 500 }
    );
  }
}
