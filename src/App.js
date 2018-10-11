import React, { Component } from "react";
//import Button from "@material-ui/core/Button";
import "./App.css";
import Web3 from "web3";
import fetch from "node-fetch";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import TextField from "@material-ui/core/TextField";
import Tooltip from "@material-ui/core/Tooltip";
import { addUrlProps, UrlQueryParamTypes } from "react-url-query";

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
			web3Provider: "metamask",
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
			this.state.web3Provider = "infura";
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
			if (!account && this.state.web3Provider === "metamask") {
				// only work on local web3
				account = await this.web3.eth.getCoinbase();
				console.log("local account: ", account);
			}
			//investorAddressList = [account];
			console.log("query2: " + account);
			this.setState({ search: account + "" });
			console.log("search: ", this.state.search);

			await this.bet(account);
		} catch (ex) {
			this.setState({ error: "No Account" });
			console.log(ex);
		}
		this.setState({ loading: false });
	}

	async bet(address) {
		try {
			let web3 = this.web3;

			const investorAddress = address || this.state.search;
			console.log(`investor -- ${investorAddress} --`);
			if (!investorAddress || investorAddress.length != 42) {
				console.log(`Invaild address`);
				this.setState({ error: "Invaild address", loading: false });
				return;
			}

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

			let wei = await x.invested(investorAddress).call();
			let investedFund = parseFloat(web3.utils.fromWei(wei));
			if (investedFund == 0) {
				console.log(`No investment`);
				this.setState({ error: "No investment", loading: false });
				return;
			}

			console.log(`invested: ${investedFund}`);

			wei = await web3.eth.getBalance(contractAddress);
			let contractBalance = parseFloat(web3.utils.fromWei(wei)).toFixed(
				3
			);
			console.log(`contract balance: ${contractBalance}`);
			console.log(`\n`);

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
				restFund / (profit / (currentBlockTime - blockInvestedTime));

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
				returnTime,
				error: "",
				loading: false
			});
		} catch (ex) {
			console.log(ex);
			this.setState({ error: "ERROR", loading: false });
		}
	}

	handleChange = event => {
		this.setState({ search: event.target.value || "" });
		if (event.target.value.length == 42) {
			//investorAddressList = [event.target.value];
			this.bet(event.target.value);
		}
	};

	keyPress = event => {
		//console.log(event);
		if (event.key == "Enter") {
			//investorAddressList = [this.state.search];
			this.bet();
		}
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
									alt=""
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
					<div className="row">
						<div className="col-lg-4 text-center">
							<TextField
								label="Account"
								className={this.classes.textField}
								style={{ width: "400px" }}
								value={this.state.search}
								onChange={this.handleChange}
								onKeyPress={this.keyPress}
								margin="normal"
							/>
						</div>
						{/* <div className="col-lg-4 text-center">
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
						</div> */}
					</div>
					<br />
					<div className="row">
						<div className="col-lg-4 text-center">
							{this.state.loading ? (
								<p className="text-center">Loading...</p>
							) : (
								<div>
									{this.state.error ? (
										<p>{this.state.error}</p>
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
													<td>
														Real-time Profit{" "}
														<span role="img">
															🔥
														</span>
													</td>
													<td>
														{this.state.profit} ETH
													</td>
												</tr>
												<tr>
													<td>Block (Invested)</td>
													<td>
														{this.state.oldBlock +
															" ⏰ " +
															this.state
																.blockInvestedTime}
													</td>
												</tr>
												<tr>
													<td>Block (Current)</td>
													<td>
														{this.state
															.currentBlock +
															" ⏰ " +
															this.state
																.currentBlockTime}
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
													<td>
														Transfer Out{" "}
														<span role="img">
															🍺
														</span>
													</td>
													<td>
														{this.state.transferOut}{" "}
														ETH
													</td>
												</tr>
												<tr>
													<td>
														<Tooltip title=" Rest Fund = Invested Fund - Transfer Out">
															<label>
																Rest Fund{" "}
																<span role="img">
																	💰
																</span>
															</label>
														</Tooltip>
													</td>
													<td>
														{this.state.restFund}{" "}
														ETH
													</td>
												</tr>
												{/* <tr>
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
												</tr> */}
												<tr>
													<td>
														{" "}
														<Tooltip title="The time you will take all your invested fund back">
															<label>
																Time (return){" "}
																<span role="img">
																	⏰
																</span>
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
