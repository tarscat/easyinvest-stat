import React, { Component } from "react";
import Button from "@material-ui/core/Button";
import "./App.css";
import Web3 from "web3";
import fetch from "node-fetch";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import TextField from "@material-ui/core/TextField";
import Tooltip from "@material-ui/core/Tooltip";
import { addUrlProps, UrlQueryParamTypes } from "react-url-query";

let investorAddressList = [
	"0xe79b84906abb7dde4cc81bd27bc89a7e97366c0c",
	"0x0779d5536c81a1512aa29f4777648570c2bd2ad3"
];

const contractAddress = "0xa25560d083fe0ea3e303c11577b5a345b236fac7";
const urlPropsQueryConfig = {
	text: { type: UrlQueryParamTypes.string },
	id: { type: UrlQueryParamTypes.string, queryParam: "id" },
	address: { type: UrlQueryParamTypes.string, queryParam: "address" }
};

class App extends Component {
	constructor(props) {
		super(props);
		this.classes = props;
		console.log(`props: ${JSON.stringify(this.props)}`);
		// var p = qs.parse(this.window.location.search, {
		//   ignoreQueryPrefix: true
		// });

		//console.log(`p: ${p}`);
		this.state = {
			search: "",
			account: "",
			balance: "?",
			oldBlock: "?",
			currentBlock: "?",
			contractBalance: "?",
			investedFund: "?",
			profit: "?",
			transferOut: "?",
			restFund: "?",
			blockInvestedTime: "",
			currentBlockTime: "",
			returnTime: "",
			loading: false
		};

		let account = "";
		if (this.props.match) {
			account = this.props.match.params.account;
			console.log(`match account: ${this.props.match.params.account}`);
		}
		if (account) {
			this.state.account = account;
			this.state.search = account;
			//console.log(`props.account: ${props.account}`);
		}

		if (typeof web3 !== "undefined") {
			this.web3Provider = window.web3.currentProvider;
		} else {
			this.web3Provider = new Web3.providers.HttpProvider(
				"https://mainnet.infura.io/v3/4f648dd2d1384b7dab303f0baaed4f6f"
			);
		}

		this.web3 = new Web3(this.web3Provider);
		let version = this.web3.version;
		console.log(`web3: ${version}`);
	}

	async componentDidMount() {
		if (this.props.match) {
			console.log(`match account: ${this.props.match.params.account}`);
		}

		let account = this.props.address || this.props.id;
		console.log("query: " + account);
		try {
			if (!account) {
				account = await this.web3.eth.getCoinbase();
				console.log("local account: ", account);
			}
			investorAddressList = [account];
			//console.log("state's account: ", this.state.account);

			await this.bet();
		} catch (ex) {
			this.setState({ error: "No Account" });
			console.log(ex);
		}
		this.setState({ loading: false });
	}

	async bet() {
		try {
			let web3 = this.web3;
			this.setState({ loading: true });

			let currentBlock = await web3.eth.getBlockNumber();
			console.log(`currentBlock: ${currentBlock}`);

			let resp = await fetch(
				"https://api.etherscan.io/api?module=contract&action=getabi&address=" +
					contractAddress
			);

			const json = await resp.json();
			const contractABI = JSON.parse(json.result);
			const instance = new web3.eth.Contract(
				contractABI,
				contractAddress
			);
			const x = instance.methods;

			let wei = await web3.eth.getBalance(contractAddress);
			let contractBalance = parseFloat(web3.utils.fromWei(wei)).toFixed(
				3
			);
			console.log(`contract balance: ${contractBalance}`);
			console.log(`\n`);

			for (var i = 0; i < investorAddressList.length; i++) {
				const investorAddress = investorAddressList[i];
				console.log(`investor -- ${investorAddress} --`);
				wei = await x.invested(investorAddress).call();
				let investedFund = parseFloat(web3.utils.fromWei(wei));
				console.log(`invested: ${investedFund}`);

				let oldBlock = await x.atBlock(investorAddress).call();
				// console.log(`block: ${oldBlock}`);

				let profit = (
					((investedFund / 10) * (currentBlock - oldBlock)) /
					5900
				).toFixed(3);
				console.log(`profit: ${profit}`);

				// internal tx
				const url = `https://api.etherscan.io/api?module=account&action=txlistinternal&address=${investorAddress}&startblock=0&endblock=99999999&sort=asc&apikey=YourApiKeyToken`;
				const internalTxs = (await (await fetch(url)).json()).result;
				let transferOut = 0;
				for (var j = 0; j < internalTxs.length; j++) {
					if (internalTxs[j].from === contractAddress) {
						transferOut += parseFloat(
							web3.utils.fromWei(internalTxs[j].value)
						);
					}
				}

				let restFund = (investedFund - transferOut).toFixed(3);
				console.log(`restFund: ${restFund}`);
				investedFund = investedFund.toFixed(3);
				transferOut = transferOut.toFixed(3);

				// block time
				let blockInvestedTime =
					(await web3.eth.getBlock(oldBlock)).timestamp * 1000;

				let currentBlockTime =
					(await web3.eth.getBlock(currentBlock)).timestamp * 1000;

				let returnTime =
					blockInvestedTime +
					restFund /
						(profit / (currentBlockTime - blockInvestedTime));

				blockInvestedTime = this.formatDate(blockInvestedTime);
				currentBlockTime = this.formatDate(currentBlockTime);
				returnTime = this.formatDate(returnTime);
				console.log(`Time (old block):     ${blockInvestedTime}`);
				console.log(`Time (current block): ${currentBlockTime}`);
				console.log(`Time (return):        ${returnTime}`);
				console.log(`\n`);

				this.setState({
					account: investorAddress,
					oldBlock,
					currentBlock,
					contractBalance,
					investedFund,
					profit,
					transferOut,
					restFund,
					blockInvestedTime,
					currentBlockTime,
					returnTime
				});
			}

			this.setState({ error: "", loading: false });
		} catch (ex) {
			console.log(ex);
			this.setState({ error: "ERROR", loading: false });
		}
	}

	handleChange = event => {
		this.setState({ search: event.target.value });
		//investorAddressList = [event.target.value];
		//this.bet();
	};

	formatDate(d) {
		return new Date(d).toLocaleString();
	}

	render() {
		return (
			<div className="row">
				<div className="col-lg-12 text-center">
					<div className={this.classes.root}>
						<AppBar position="static">
							<Toolbar>
								<img
									src="https://easyinvest10.app/images/apple-icon.png"
									style={{ width: "32px" }}
								/>
								&nbsp;
								<h1>EasyInvest10 Analysis</h1>
								&nbsp;
								<div className={this.classes.grow} />
							</Toolbar>
						</AppBar>
					</div>
					{/* <div>
						<ul>
							<li>
								<a href="?id=0xe79b84906abb7dde4cc81bd27bc89a7e97366c0c">
									0xe79b84906abb7dde4cc81bd27bc89a7e97366c0c
								</a>
							</li>
							<li>
								<a href="?id=0x0779D5536c81a1512aa29F4777648570C2bD2AD3">
									0x0779D5536c81a1512aa29F4777648570C2bD2AD3
								</a>
							</li>
						</ul>
					</div> */}
					<div className="row">
						<div className="col-lg-4 text-center">
							<TextField
								label="Account"
								className={this.classes.textField}
								style={{ width: "400px" }}
								value={this.state.search}
								onChange={this.handleChange}
								margin="normal"
							/>
						</div>
						<div className="col-lg-4 text-center">
							<Button
								variant="contained"
								color="primary"
								onClick={event => {
									investorAddressList = [this.state.search];
									event.preventDefault();
									this.bet();
								}}
							>
								Search
							</Button>
						</div>
					</div>
					<br />
					<div className="row">
						<div className="col-lg-4 text-center">
							{this.state.loading ? (
								<p className="text-center">Loading...</p>
							) : (
								<div>
									{this.state.error ? (
										<p>No Result!</p>
									) : (
										<table className="fency-table">
											<thead>
												<tr>
													<th>Field</th>
													<th>Value</th>
												</tr>
											</thead>
											<tbody>
												<tr>
													<td>Account</td>
													<td>
														<a
															href={
																"https://etherscan.io/address/" +
																this.state
																	.account
															}
															target="_blank"
														>
															{this.state.account}
														</a>
													</td>
												</tr>
												<tr>
													<td>Real-time Profit 🔥</td>
													<td>
														{this.state.profit} ETH
													</td>
												</tr>
												<tr>
													<td>Block (Invested)</td>
													<td>
														{this.state.oldBlock}
													</td>
												</tr>
												<tr>
													<td>Block (Current)</td>
													<td>
														{
															this.state
																.currentBlock
														}
													</td>
												</tr>
												{/* <tr>
											<td>Contract Balance</td>
											<td>
												{this.state.contractBalance}
											</td>
										</tr> */}
												<tr>
													<td>Invested Fund</td>
													<td>
														{
															this.state
																.investedFund
														}{" "}
														ETH
													</td>
												</tr>
												<tr>
													<td>Transfer Out 🍺</td>
													<td>
														{this.state.transferOut}{" "}
														ETH
													</td>
												</tr>
												<tr>
													<td>
														<Tooltip title=" Rest Fund = Invested Fund - Transfer Out">
															<label>
																Rest Fund 💰
															</label>
														</Tooltip>
													</td>
													<td>
														{this.state.restFund}{" "}
														ETH
													</td>
												</tr>
												<tr>
													<td>Time (last block)</td>
													<td>
														{
															this.state
																.blockInvestedTime
														}
													</td>
												</tr>
												<tr>
													<td>
														Time (current block)
													</td>
													<td>
														{
															this.state
																.currentBlockTime
														}
													</td>
												</tr>
												<tr>
													<td>
														{" "}
														<Tooltip title="The time you will take all your invested fund back">
															<label>
																Time (return)
															</label>
														</Tooltip>
													</td>
													<td>
														{this.state.returnTime}
													</td>
												</tr>
											</tbody>
										</table>
									)}
								</div>
							)}
						</div>
					</div>
					<br />
				</div>
			</div>
		);
	}
}

export default addUrlProps({ urlPropsQueryConfig })(App);
