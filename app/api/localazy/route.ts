import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const token = process.env.LOCALAZY_API_TOKEN;

    if (!token) {
      return NextResponse.json(
        { error: 'Localazy API token not configured' },
        { status: 500 }
      );
    }

    // Step 1: Fetch all projects to get the correct project and file IDs
    const projectsResponse = await fetch('https://api.localazy.com/projects', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!projectsResponse.ok) {
      const errorText = await projectsResponse.text();
      throw new Error(`Failed to fetch projects: ${projectsResponse.statusText} - ${errorText}`);
    }

    const projects = await projectsResponse.json();
    console.log('Projects response:', JSON.stringify(projects, null, 2));

    if (!projects || projects.length === 0) {
      throw new Error('No projects found in your Localazy account');
    }

    // Use the first project (you can modify this logic to select a specific project)
    const projectId = projects[0].id;
    console.log('Using project ID:', projectId);

    // Step 2: Fetch files for the project
    const filesResponse = await fetch(
      `https://api.localazy.com/projects/${projectId}/files`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!filesResponse.ok) {
      const errorText = await filesResponse.text();
      throw new Error(`Failed to fetch files: ${filesResponse.statusText} - ${errorText}`);
    }

    const filesData = await filesResponse.json();
    console.log('Files response:', JSON.stringify(filesData, null, 2));

    // The response is an array of files directly
    if (!filesData || !Array.isArray(filesData) || filesData.length === 0) {
      throw new Error('No files found in the project');
    }

    // Use the first file (you can modify this logic to select a specific file)
    const fileId = filesData[0].id;
    console.log('Using file ID:', fileId);

    // Step 3: Fetch both English and Japanese files in parallel
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
      const errorText = await enResponse.text();
      throw new Error(`Failed to fetch English file: ${enResponse.statusText} - ${errorText}`);
    }

    if (!jaResponse.ok) {
      const errorText = await jaResponse.text();
      throw new Error(`Failed to fetch Japanese file: ${jaResponse.statusText} - ${errorText}`);
    }

    const enJson = await enResponse.json();
    const jaJson = await jaResponse.json();

    return NextResponse.json({
      success: true,
      data: {
        enJson,
        jaJson,
        projectId,
        fileId,
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
