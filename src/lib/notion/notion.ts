import { Client } from '@notionhq/client';
import {
	NOTION_KEY,
	COMMISSIONS_DB,
	BLOGS_DB,
	POEMS_SECTIONS_DB,
	ALL_SCRAPS_DB,
	USER_ID_ALICE
} from '$env/static/private';

const notion = new Client({ auth: NOTION_KEY });

const today = new Date(Date.now()).toISOString();

export async function addCommission(name: string, email: string, description: string) {
	if (!NOTION_KEY || !COMMISSIONS_DB) {
		throw Error('Missing API keys from Notion.');
	}
	try {
		const response = await notion.pages.create({
			parent: { database_id: COMMISSIONS_DB },
			properties: {
				title: {
					title: [
						{
							text: {
								content: name
							}
						}
					]
				},
				Email: {
					email: email
				},
				Description: {
					rich_text: [
						{
							text: {
								content: description
							}
						}
					]
				},
				Notify: {
					people: [
						{
							id: USER_ID_ALICE
						}
					]
				}
			}
		});
		return response;
	} catch (error) {
		let errorMessage = 'Posting to commissions failed generically.';
		if (error instanceof Error) {
			errorMessage = error.message;
		}
		return errorMessage;
	}
}

export async function getSections() {
	try {
		const response = await notion.databases.query({
			database_id: POEMS_SECTIONS_DB,
			filter: {
				and: [
					{
						property: 'Published',
						checkbox: {
							equals: true
						}
					}
				]
			},
			sorts: [
				{
					direction: 'ascending',
					property: 'Sequence'
				}
			]
		});
		return response;
	} catch (error) {
		let errorMessage = 'Retrieving sections failed generically.';
		if (error instanceof Error) {
			errorMessage = error.message;
		}
		return errorMessage;
	}
}

export async function getScraps() {
	try {
		const response = await notion.databases.query({
			database_id: ALL_SCRAPS_DB,
			filter: {
				and: [
					{
						property: 'Published',
						checkbox: {
							equals: true
						}
					}
				]
			},
			sorts: [
				{
					direction: 'ascending',
					property: 'Sequence'
				}
			]
		});
		return response;
	} catch (error) {
		let errorMessage = 'Retrieving scraps failed generically.';
		if (error instanceof Error) {
			errorMessage = error.message;
		}
		return errorMessage;
	}
}

export async function getPoem(id: string) {
	try {
		const response = await notion.blocks.children.list({
			block_id: id
		});
		return response;
	} catch (error) {
		let errorMessage = 'Retrieving poem failed generically.';
		if (error instanceof Error) {
			errorMessage = error.message;
		}
		return errorMessage;
	}
}

export async function getBlogs(slug?: string) {
	try {
		const response = await notion.databases.query({
			database_id: BLOGS_DB,
			filter: {
				and: [
					{
						property: 'Publication Date',
						date: {
							on_or_before: today
						}
					},
					{
						property: 'Slug',
						url: {
							equals: slug ? slug : ''
						}
					}
				]
			},
			sorts: [
				{
					direction: 'descending',
					property: 'Publication Date'
				}
			]
		});
		return response;
	} catch (error) {
		let errorMessage = 'Retrieving blogs failed generically.';
		if (error instanceof Error) {
			errorMessage = error.message;
		}
		return errorMessage;
	}
}

export async function getContent(slug?: string) {
	try {
		let response = [];

		const query = await notion.databases.query({
			database_id: BLOGS_DB,
			filter: {
				and: [
					{
						property: 'Slug',
						url: {
							equals: slug ? slug : ''
						}
					}
				]
			},
			sorts: [
				{
					direction: 'descending',
					property: 'Publication Date'
				}
			]
		});

		response.push(query);

		async function listChildren(cursor?: string | undefined) {
			if (query.results[0]?.id) {
				const res = await notion.blocks.children.list({
					block_id: query.results[0].id,
					start_cursor: cursor ? cursor : undefined
				});

				if (res?.has_more === true) {
					const more_res = await listChildren(res.next_cursor);
					res.results.push(...more_res.results);
				}

				return res;
			}
			return;
		}

		async function fetchSyncedBlockContent(syncedBlockId) {
			// Fetch the content of the original block using the ID
			const originalBlock = await notion.blocks.children.list({
				block_id: syncedBlockId
			});

			// Replace the synced_block with the content of the original block
			return originalBlock;
		}

		const content = await listChildren();

		// Iterate through the content and replace synced blocks with their content
		for (let i = 0; i < content.results.length; i++) {
			const block = content.results[i];

			if (block.type === 'synced_block') {
				const originalBlockContent = await fetchSyncedBlockContent(
					block.synced_block.synced_from.block_id
				);
				// Replace the synced block with the content of the original block
				content.results.splice(i, 1, ...originalBlockContent.results);
			}
		}

		response.push(content);
		return response;
	} catch (error) {
		let errorMessage = 'Posting to commissions failed generically.';
		if (error instanceof Error) {
			errorMessage = error.message;
		}
		return errorMessage;
	}
}

// export async function getRestOfContent(id: string, next_cursor: string) {
// 	try {
// 		const response = await notion.blocks.children.list({
// 			block_id: id,
// 			start_cursor: next_cursor
// 		});
// 		return response;
// 	} catch (error) {
// 		let errorMessage = 'Retrieving blogs failed generically.';
// 		if (error instanceof Error) {
// 			errorMessage = error.message;
// 		}
// 		return errorMessage;
// 	}
// }

export async function retrieveBlock(id: string, method: string) {
	if (method === 'children') {
		const content = await notion.blocks.children.list({
			block_id: id
		});
		return content;
	}
	const content = await notion.blocks.retrieve({
		block_id: id
	});
	return content;
}
