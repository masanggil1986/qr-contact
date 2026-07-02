export interface Contact {
	name: string;
	organization: string;
	title: string;
	mobile: string;
	phone: string;
	email: string;
	url: string;
	address: string;
}

export const emptyContact: Contact = {
	name: '',
	organization: '',
	title: '',
	mobile: '',
	phone: '',
	email: '',
	url: '',
	address: ''
};
